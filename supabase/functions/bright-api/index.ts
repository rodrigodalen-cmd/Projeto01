import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_BASE = 'https://api.mercadopago.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    // ── Auth: requer JWT válido do usuário ───────────────────────────
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Não autorizado' }, 401);

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: 'Não autorizado' }, 401);

    const token = Deno.env.get('MP_ACCESS_TOKEN');
    if (!token) return json({ error: 'MP_ACCESS_TOKEN não configurado' }, 500);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Chave de idempotência estável por requisição (não por tentativa)
    const idempotencyKey = crypto.randomUUID();

    const mpFetch = (path: string, opts: RequestInit = {}) =>
      fetch(`${MP_BASE}${path}`, {
        ...opts,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
          ...((opts.headers as Record<string, string>) || {}),
        },
      });

    // ── CREATE: gera cobrança PIX ────────────────────────────────────
    if (action === 'create') {
      const { bolaoId, amount, description, email } = body;
      const valor = parseFloat(String(amount));
      if (!valor || valor <= 0) return json({ error: 'Valor inválido' }, 400);

      const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const resp = await mpFetch('/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          transaction_amount: valor,
          description: description || `Bolão FC – R$${valor}`,
          payment_method_id: 'pix',
          payer: { email: email || 'bolao@bolaofc.com.br' },
          external_reference: String(bolaoId || ''),
          date_of_expiration: expiry,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error('[create] MP error:', JSON.stringify(data));
        return json({ error: data.message || 'Erro ao gerar PIX' }, 400);
      }

      const txData = data.point_of_interaction?.transaction_data ?? {};
      return json({
        txid: String(data.id),
        qrCodeBase64: txData.qr_code_base64 ?? null,
        copiaECola: txData.qr_code ?? null,
      });
    }

    // ── STATUS: verifica se foi pago ─────────────────────────────────
    if (action === 'status') {
      const { txid } = body;
      if (!txid) return json({ paid: false, error: 'txid ausente' });

      const resp = await mpFetch(`/v1/payments/${txid}`);
      const data = await resp.json();
      return json({
        paid: data.status === 'approved',
        status: data.status ?? 'unknown',
      });
    }

    // ── REFUND: estorna pagamento ────────────────────────────────────
    if (action === 'refund') {
      const { txid } = body;
      if (!txid) return json({ error: 'txid ausente' }, 400);

      const resp = await mpFetch(`/v1/payments/${txid}/refunds`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error('[refund] MP error:', JSON.stringify(data));
        return json({ error: data.message || 'Erro ao reembolsar' }, 400);
      }
      return json({ ok: true, refundId: data.id });
    }

    // ── PAYOUT: envia prêmio PIX para o vencedor ─────────────────────
    if (action === 'payout') {
      const { pixKey, amount, description } = body;
      const valor = parseFloat(String(amount));
      if (!pixKey || !valor || valor <= 0) return json({ error: 'pixKey ou amount inválido' }, 400);

      const resp = await mpFetch('/v1/account/bank_transfers', {
        method: 'POST',
        body: JSON.stringify({
          amount: valor,
          origin_account: { type: 'current_account' },
          destination_account: { pix: { key: pixKey } },
          metadata: { description: description || 'Premio Bolao FC' },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error('[payout] MP error:', JSON.stringify(data));
        return json({ error: data.message || 'Erro ao enviar prêmio. Verifique as permissões de transferência na conta Mercado Pago.' }, 400);
      }
      return json({ ok: true, id: data.id });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);

  } catch (e) {
    console.error('[bright-api] error:', e);
    return json({ error: String(e) }, 500);
  }
});
