import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MP_BASE = 'https://api.mercadopago.com'

function getToken(): string {
  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurada no Supabase Secrets')
  return token
}

function detectPixKeyType(key: string): string {
  const cleaned = key.replace(/[\s.()\-+]/g, '')
  if (key.includes('@')) return 'email'
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return 'random_key'
  if (/^\d{14}$/.test(cleaned)) return 'CNPJ'
  if (/^\d{11}$/.test(cleaned)) return 'CPF'
  if (/^\d{10,11}$/.test(cleaned)) return 'phone'
  return 'email'
}

async function createCharge(amount: number, bolaoId: string, description: string, email: string) {
  const idempotencyKey = `bolao-${bolaoId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`

  const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace('Z', '-03:00')
  const body = {
    transaction_amount: Number(amount),
    payment_method_id: 'pix',
    installments: 1,
    date_of_expiration: expiration,
    payer: {
      email: email && email.includes('@') ? email : 'pagador@bolaofc.app',
      identification: { type: 'CPF', number: '00000000000' },
    },
    description: description.substring(0, 60),
    external_reference: bolaoId,
  }

  console.log('[MP] createCharge:', JSON.stringify(body))

  const res = await fetch(`${MP_BASE}/v1/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  const data = JSON.parse(text)
  const poi = data.point_of_interaction
  console.log('[MP] status:', res.status, '| poi_type:', poi?.type, '| has_txdata:', !!poi?.transaction_data)
  console.log('[MP] full body:', text.slice(0, 800))

  if (!res.ok) throw new Error(`Erro ao criar cobrança (${res.status}): ${text.slice(0, 300)}`)

  const txData = poi?.transaction_data

  let qrCodeBase64 = txData?.qr_code_base64 ?? null
  if (qrCodeBase64?.startsWith('data:')) {
    qrCodeBase64 = qrCodeBase64.split(',')[1] ?? null
  }

  return {
    txid: String(data.id),
    status: data.status,
    copiaECola: txData?.qr_code ?? null,
    qrCodeBase64,
  }
}

async function checkStatus(txid: string) {
  const res = await fetch(`${MP_BASE}/v1/payments/${txid}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  })

  if (!res.ok) throw new Error(`Erro ao consultar cobrança (${res.status})`)

  const data = await res.json()
  return { txid, status: data.status, paid: data.status === 'approved' }
}

async function sendRefund(txid: string) {
  console.log('[MP] refund payment:', txid)
  const res = await fetch(`${MP_BASE}/v1/payments/${txid}/refunds`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  const text = await res.text()
  console.log('[MP] refund status:', res.status, '| body:', text.slice(0, 400))
  if (!res.ok) throw new Error(`Erro ao reembolsar (${res.status}): ${text.slice(0, 300)}`)

  const data = JSON.parse(text)
  return { txid, refundId: String(data.id), status: data.status }
}

async function sendPayout(amount: number, pixKey: string, description: string) {
  const keyType = detectPixKeyType(pixKey)
  console.log('[MP] payout:', amount, 'BRL → pix key type:', keyType)

  const body = {
    amount,
    currency_id: 'BRL',
    description: description.substring(0, 60),
    origin: { type: 'account' },
    destination: {
      type: 'pix',
      pix_data: {
        key: pixKey,
        key_type: keyType,
      },
    },
  }

  const res = await fetch(`${MP_BASE}/v1/transfers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `payout-${Date.now()}-${pixKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  console.log('[MP] payout status:', res.status, '| body:', text.slice(0, 400))
  if (!res.ok) throw new Error(`Erro ao enviar prêmio (${res.status}): ${text.slice(0, 300)}`)

  return JSON.parse(text)
}

async function handleWebhook(body: Record<string, unknown>) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const paymentId = ((body.data as Record<string, unknown>)?.id ?? body.id) as string
  if (!paymentId) return

  const res = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  })
  if (!res.ok) return

  const payment = await res.json()
  if (payment.status !== 'approved') return

  const txid = String(paymentId)

  const { data: boloes } = await supabase.from('boloes').select('*')
  if (!boloes) return

  for (const bolao of boloes) {
    const participants: Array<Record<string, unknown>> = bolao.participants || []
    const idx = participants.findIndex(p => p.pixTxid === txid)
    if (idx < 0) continue

    participants[idx].paid = true
    participants[idx].pixPaidAt = new Date().toISOString()

    const messages: Array<Record<string, unknown>> = bolao.messages || []
    messages.push({
      email: '__system__',
      name: 'Sistema',
      text: `💸 ${participants[idx].name} pagou via PIX · R$${Number(payment.transaction_amount || 0).toFixed(2)}`,
      time: new Date().toISOString(),
      system: true,
    })

    await supabase
      .from('boloes')
      .update({ participants, messages })
      .eq('id', bolao.id)

    console.log(`[MP] PIX confirmado: ${txid} | bolão: ${bolao.id}`)
    break
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = new URL(req.url)

  try {
    if (req.method === 'POST' && url.searchParams.get('webhook') === 'pix') {
      const body = await req.json()
      console.log('[MP] webhook:', JSON.stringify(body))
      await handleWebhook(body)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { action, bolaoId, amount, description, txid, email, pixKey } = await req.json()

    if (action === 'create') {
      if (!bolaoId || !amount) throw new Error('bolaoId e amount são obrigatórios')
      const result = await createCharge(
        Number(amount),
        String(bolaoId),
        description || `Bolão FC – R$${amount}`,
        String(email || ''),
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

    if (action === 'refund') {
      if (!txid) throw new Error('txid é obrigatório')
      const result = await sendRefund(String(txid))
      return new Response(JSON.stringify(result), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'payout') {
      if (!pixKey || !amount) throw new Error('pixKey e amount são obrigatórios')
      const result = await sendPayout(
        Number(amount),
        String(pixKey),
        description || 'Prêmio Bolão FC',
      )
      return new Response(JSON.stringify(result), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    throw new Error(`Ação desconhecida: ${action}`)

  } catch (e) {
    console.error('[MP] erro:', e.message)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
