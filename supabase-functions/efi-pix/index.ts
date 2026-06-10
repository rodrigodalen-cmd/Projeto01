import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENPIX_BASE = 'https://api.openpix.com.br'

function getApiKey(): string {
  const key = Deno.env.get('OPENPIX_API_KEY')
  if (!key) throw new Error('OPENPIX_API_KEY não configurada no Supabase Secrets')
  return key
}

async function createCharge(amount: number, bolaoId: string, description: string) {
  const correlationID = `bolao${bolaoId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}${Date.now().toString().slice(-8)}`

  const body = {
    correlationID,
    value: Math.round(amount * 100),
    comment: description.substring(0, 140),
    expiresIn: 3600,
    type: 'DYNAMIC',
  }

  console.log('[PIX] createCharge:', JSON.stringify(body))

  const res = await fetch(`${OPENPIX_BASE}/api/v1/charge`, {
    method: 'POST',
    headers: {
      'Authorization': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  console.log('[PIX] charge status:', res.status, 'body:', text)

  if (!res.ok) throw new Error(`Erro ao criar cobrança (${res.status}): ${text}`)

  const data = JSON.parse(text)
  const charge = data.charge ?? data

  let qrCodeBase64 = charge.qrCodeImage ?? null
  if (qrCodeBase64?.startsWith('data:')) {
    qrCodeBase64 = qrCodeBase64.split(',')[1] ?? null
  }

  return {
    txid: correlationID,
    status: charge.status,
    copiaECola: charge.brCode ?? null,
    qrCodeBase64,
  }
}

async function checkStatus(txid: string) {
  const res = await fetch(`${OPENPIX_BASE}/api/v1/charge/${txid}`, {
    headers: { 'Authorization': getApiKey() },
  })

  if (!res.ok) throw new Error(`Erro ao consultar cobrança (${res.status})`)

  const data = await res.json()
  const charge = data.charge ?? data
  return { txid, status: charge.status, paid: charge.status === 'COMPLETED' }
}

async function handleWebhook(body: Record<string, unknown>) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const charge = (body.charge ?? body) as Record<string, unknown>
  if (charge.status !== 'COMPLETED') return

  const correlationID = charge.correlationID as string
  if (!correlationID) return

  const { data: boloes } = await supabase.from('boloes').select('*')
  if (!boloes) return

  for (const bolao of boloes) {
    const participants: Array<Record<string, unknown>> = bolao.participants || []
    const idx = participants.findIndex(p => p.pixTxid === correlationID)
    if (idx < 0) continue

    participants[idx].paid = true
    participants[idx].pixPaidAt = new Date().toISOString()

    const messages: Array<Record<string, unknown>> = bolao.messages || []
    messages.push({
      email: '__system__',
      name: 'Sistema',
      text: `💸 ${participants[idx].name} pagou via PIX · R$${(Number(charge.value ?? 0) / 100).toFixed(2)}`,
      time: new Date().toISOString(),
      system: true,
    })

    await supabase
      .from('boloes')
      .update({ participants, messages })
      .eq('id', bolao.id)

    console.log(`[PIX] confirmado: ${correlationID} | bolão: ${bolao.id}`)
    break
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = new URL(req.url)

  try {
    if (req.method === 'POST' && url.searchParams.get('webhook') === 'pix') {
      const body = await req.json()
      console.log('[PIX] webhook:', JSON.stringify(body))
      await handleWebhook(body)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { action, bolaoId, amount, description, txid } = await req.json()

    if (action === 'create') {
      if (!bolaoId || !amount) throw new Error('bolaoId e amount são obrigatórios')
      const result = await createCharge(
        Number(amount),
        String(bolaoId),
        description || `Bolão FC – R$${amount}`,
      )
      return new Response(JSON.stringify(result), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'status') {
      if (!txid) throw new Error('txid é obrigatório')
      const result = await checkStatus(String(txid))
      return new Response(JSON.stringify(result), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    throw new Error(`Ação desconhecida: ${action}`)

  } catch (e) {
    console.error('[PIX] erro:', e.message)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
