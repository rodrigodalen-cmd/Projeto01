import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { bolaoId, amount, payerEmail, description } = await req.json()

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    if (!MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado')

    const body = {
      transaction_amount: Number(amount),
      description: String(description).substring(0, 255),
      payment_method_id: 'pix',
      payer: { email: String(payerEmail) },
      external_reference: String(bolaoId),
      notification_url: 'https://fzrvjdmhymzneiuekvqc.supabase.co/functions/v1/rapid-processor',
    }

    console.log('[PIX] request:', JSON.stringify(body))

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `bolao-${bolaoId}-${Date.now()}`,
      },
      body: JSON.stringify(body),
    })

    const mpData = await mpRes.json()
    console.log('[PIX] mp status:', mpRes.status, 'response:', JSON.stringify(mpData))

    if (!mpRes.ok) {
      const msg = mpData?.message || mpData?.cause?.[0]?.description || `MP API error ${mpRes.status}`
      throw new Error(msg)
    }

    const pix = mpData?.point_of_interaction?.transaction_data

    return new Response(JSON.stringify({
      paymentId: mpData.id,
      status: mpData.status,
      statusDetail: mpData.status_detail,
      qrCode: pix?.qr_code ?? null,
      qrCodeBase64: pix?.qr_code_base64 ?? null,
      ticketUrl: pix?.ticket_url ?? mpData?.transaction_details?.external_resource_url ?? null,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (e) {
    console.error('[PIX] error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
