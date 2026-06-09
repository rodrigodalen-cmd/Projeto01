import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EFI_BASE_PROD = 'https://pix.api.efipay.com.br'
const EFI_BASE_HML  = 'https://pix-h.api.efipay.com.br'

function isProd() {
  return Deno.env.get('EFI_PROD') === 'true'
}

function getBase() {
  return isProd() ? EFI_BASE_PROD : EFI_BASE_HML
}

// Build Deno HTTP client with mTLS certificate (required by Banco Central / Efí)
// Certificates must be stored as Base64-encoded PEM strings in Supabase Secrets.
// To convert your .p12 on a computer:
//   openssl pkcs12 -in cert.p12 -nokeys -out cert.pem -nodes -legacy
//   openssl pkcs12 -in cert.p12 -nocerts -out key.pem  -nodes -legacy
//   base64 -w0 cert.pem  → EFI_CERT_PROD  (or EFI_CERT_HML)
//   base64 -w0 key.pem   → EFI_CERT_KEY_PROD (or EFI_CERT_KEY_HML)
function buildHttpClient(): Deno.HttpClient {
  const prod  = isProd()
  const certB64 = Deno.env.get(prod ? 'EFI_CERT_PROD'     : 'EFI_CERT_HML')
  const keyB64  = Deno.env.get(prod ? 'EFI_CERT_KEY_PROD' : 'EFI_CERT_KEY_HML')

  if (!certB64 || !keyB64) {
    throw new Error(
      'Certificado Efí não configurado. ' +
      'Adicione EFI_CERT_PROD e EFI_CERT_KEY_PROD no Supabase Secrets.'
    )
  }

  return Deno.createHttpClient({
    certChain: atob(certB64),
    privateKey: atob(keyB64),
  })
}

// Get OAuth2 access token from Efí
async function getToken(): Promise<string> {
  const prod         = isProd()
  const clientId     = Deno.env.get(prod ? 'EFI_CLIENT_ID_PROD'     : 'EFI_CLIENT_ID_HML')
  const clientSecret = Deno.env.get(prod ? 'EFI_CLIENT_SECRET_PROD' : 'EFI_CLIENT_SECRET_HML')

  if (!clientId || !clientSecret) throw new Error('Credenciais Efí não configuradas')

  const client = buildHttpClient()
  const creds  = btoa(`${clientId}:${clientSecret}`)

  const res = await fetch(`${getBase()}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
    client,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Efí auth falhou (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.access_token as string
}

// Create PIX immediate charge (cob)
async function createCharge(amount: number, bolaoId: string, description: string) {
  const token  = await getToken()
  const client = buildHttpClient()
  const pixKey = Deno.env.get('EFI_PIX_KEY')
  if (!pixKey) throw new Error('EFI_PIX_KEY não configurada no Supabase Secrets')

  const txid = `bolao${bolaoId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}${Date.now().toString().slice(-8)}`

  const body = {
    calendario: { expiracao: 3600 },
    valor: { original: Number(amount).toFixed(2) },
    chave: pixKey,
    solicitacaoPagador: description.substring(0, 140),
    infoAdicionais: [{ nome: 'BolaoId', valor: String(bolaoId) }],
  }

  console.log('[EFI] createCharge body:', JSON.stringify(body))

  const res = await fetch(`${getBase()}/v2/cob/${txid}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    client,
  })

  const cobText = await res.text()
  console.log('[EFI] cob status:', res.status, 'body:', cobText)

  if (!res.ok) throw new Error(`Erro ao criar cobrança (${res.status}): ${cobText}`)

  const cob = JSON.parse(cobText)

  if (!cob.loc?.id) {
    console.log('[EFI] sem loc.id, retornando sem QR code')
    return { txid: cob.txid ?? txid, status: cob.status, copiaECola: null, qrCodeBase64: null }
  }

  const qrRes = await fetch(`${getBase()}/v2/loc/${cob.loc.id}/qrcode`, {
    headers: { 'Authorization': `Bearer ${token}` },
    client,
  })
  const qrText = await qrRes.text()
  console.log('[EFI] qrcode status:', qrRes.status, 'body:', qrText)

  const qr = qrRes.ok ? JSON.parse(qrText) : { qrcode: null, imagemQrcode: null }

  // imagemQrcode pode vir como data URI ou só base64
  let qrCodeBase64 = qr.imagemQrcode ?? null
  if (qrCodeBase64?.startsWith('data:')) {
    qrCodeBase64 = qrCodeBase64.split(',')[1] ?? null
  }

  return {
    txid: cob.txid ?? txid,
    status: cob.status,
    copiaECola: qr.qrcode ?? null,
    qrCodeBase64,
  }
}

// Check charge payment status
async function checkStatus(txid: string) {
  const token  = await getToken()
  const client = buildHttpClient()

  const res = await fetch(`${getBase()}/v2/cob/${txid}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    client,
  })

  if (!res.ok) throw new Error(`Erro ao consultar cobrança (${res.status})`)

  const cob = await res.json()
  // CONCLUIDA = paid, ATIVA = pending
  return { txid: cob.txid, status: cob.status, paid: cob.status === 'CONCLUIDA' }
}

// Mark participant as paid when Efí webhook fires
async function handleWebhook(body: Record<string, unknown>) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const pixList = (body.pix as Array<{ txid: string; valor: string }>) || []

  for (const pix of pixList) {
    if (!pix.txid) continue

    const { data: boloes } = await supabase.from('boloes').select('*')
    if (!boloes) continue

    for (const bolao of boloes) {
      const participants: Array<Record<string, unknown>> = bolao.participants || []
      const idx = participants.findIndex(p => p.pixTxid === pix.txid)
      if (idx < 0) continue

      participants[idx].paid = true
      participants[idx].pixPaidAt = new Date().toISOString()

      const messages: Array<Record<string, unknown>> = bolao.messages || []
      messages.push({
        email: '__system__',
        name: 'Sistema',
        text: `💸 ${participants[idx].name} pagou via PIX · R$${pix.valor}`,
        time: new Date().toISOString(),
        system: true,
      })

      await supabase
        .from('boloes')
        .update({ participants, messages })
        .eq('id', bolao.id)

      console.log(`[EFI] PIX confirmado: ${pix.txid} | bolão: ${bolao.id}`)
      break
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = new URL(req.url)

  try {
    // Webhook from Efí servers
    if (req.method === 'POST' && url.searchParams.get('webhook') === 'pix') {
      const body = await req.json()
      console.log('[EFI] webhook:', JSON.stringify(body))
      await handleWebhook(body)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // App calls
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
    console.error('[EFI] erro:', e.message)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
