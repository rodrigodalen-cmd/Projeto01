import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

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
    if (!jwt) return json({ valid: true, error: 'unauthorized' });

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ valid: true, error: 'unauthorized' });

    const endpoint = Deno.env.get('AZURE_FACE_ENDPOINT');
    const key      = Deno.env.get('AZURE_FACE_KEY');

    // Sem credenciais Azure → modo demo (aprova automaticamente)
    if (!endpoint || !key) return json({ valid: true, demo: true });

    const imageBytes = await req.arrayBuffer();

    if (!imageBytes.byteLength)                      return json({ valid: false, reason: 'empty_image' });
    if (imageBytes.byteLength > MAX_IMAGE_BYTES)     return json({ valid: false, reason: 'image_too_large' });

    // Normaliza endpoint (remove barra final)
    const baseUrl  = endpoint.replace(/\/$/, '');
    const azureUrl = `${baseUrl}/face/v1.0/detect?detectionModel=detection_03&returnFaceId=false`;

    const azureResp = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBytes,
    });

    // Verifica status ANTES de parsear o body — evita throw em respostas não-JSON
    if (!azureResp.ok) {
      const errText = await azureResp.text().catch(() => '');
      console.error('Azure error:', azureResp.status, errText);
      // Falha na API Azure → não bloqueia o usuário; admin revisa foto
      return json({ valid: true, error: 'azure_error' });
    }

    const faces = await azureResp.json();
    const valid = Array.isArray(faces) && faces.length > 0;
    return json({ valid, faces: faces.length });

  } catch (e) {
    console.error('smooth-endpoint error:', e);
    // Erro técnico → não bloqueia usuário
    return json({ valid: true, error: String(e) });
  }
});
