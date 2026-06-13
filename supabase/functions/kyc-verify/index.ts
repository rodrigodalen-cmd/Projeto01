import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const endpoint = Deno.env.get('AZURE_FACE_ENDPOINT');
    const key      = Deno.env.get('AZURE_FACE_KEY');

    // Sem credenciais Azure → modo demo (aprova automaticamente)
    if (!endpoint || !key) {
      return new Response(JSON.stringify({ valid: true, demo: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const imageBytes = await req.arrayBuffer();
    if (!imageBytes.byteLength) {
      return new Response(JSON.stringify({ valid: false, reason: 'empty_image' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const azureUrl = `${endpoint}/face/v1.0/detect?detectionModel=detection_03&returnFaceId=false`;
    const azureResp = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBytes,
    });

    const faces = await azureResp.json();

    if (!azureResp.ok) {
      console.error('Azure error:', JSON.stringify(faces));
      // Falha na API → não bloqueia o usuário, admin revisa a foto
      return new Response(JSON.stringify({ valid: true, error: 'azure_error' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const valid = Array.isArray(faces) && faces.length > 0;
    return new Response(JSON.stringify({ valid, faces: faces.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('kyc-verify error:', e);
    // Em caso de erro técnico, não bloqueia — admin revisa
    return new Response(JSON.stringify({ valid: true, error: String(e) }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
