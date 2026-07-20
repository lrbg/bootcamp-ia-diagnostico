// Edge Function: genera un plan de trabajo personalizado con OpenAI a partir del
// diagnostico de un participante del bootcamp. Reusa el patron de Polibio:
// la OPENAI_API_KEY vive como secreto de Supabase, nunca en el frontend.
//
// Desplegar en el proyecto Supabase de Polibio (ya tiene OPENAI_API_KEY):
//   supabase functions deploy bootcamp-plan --project-ref hyylhendjtwdtflzsjdx --no-verify-jwt
//
// La usa solo el admin desde el dashboard del facilitador.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODELO = "gpt-4o-mini";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const appKey = Deno.env.get("BOOTCAMP_APP_KEY");
    const gotKey = req.headers.get("x-bootcamp-key");
    if (appKey && gotKey !== appKey) return respond({ ok: false, error: "No autorizado" }, 401);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return respond({ error: "OPENAI_API_KEY no configurado" }, 500);

    const payload = await req.json().catch(() => null);
    if (!payload || !payload.resumen) {
      return respond({ error: "Falta 'resumen' del diagnostico en el body" }, 400);
    }
    const { nombre, arquetipo, resumen } = payload;

    const system = [
      "Eres un mentor de habilidades con IA en un bootcamp corporativo.",
      "Recibes el diagnostico de un participante (que le esta fallando) y generas un",
      "plan de trabajo breve, concreto y motivador para que crezca y mejore sus skills con IA.",
      "El plan debe atacar primero sus debilidades mas severas, con acciones realistas para un",
      "profesional ocupado (27-50 años). Nada generico: usa lo que dice su diagnostico.",
      "Responde SOLO en JSON valido con esta forma:",
      '{"objetivo": string, "resumen_fallas": string, "pasos": [{"titulo": string, "accion": string, "recurso": string, "practica": string, "prioridad": "alta"|"media"|"baja"}], "cierre": string}',
      "Entre 3 y 5 pasos. 'recurso' = algo concreto para aprender (tipo de curso, doc, ejercicio).",
      "'practica' = una tarea aplicable a su trabajo. Tono cercano, en español, sin emojis.",
    ].join(" ");

    const user = `Diagnostico del participante:\n${resumen}\n\nGenera el plan de trabajo.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return respond({ error: "OpenAI fallo", status: resp.status, detalle: txt.slice(0, 300) }, 502);
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let plan;
    try { plan = JSON.parse(raw); } catch { plan = { objetivo: raw }; }

    return respond({ ok: true, nombre, arquetipo, plan, modelo: MODELO });
  } catch (e) {
    return respond({ error: String(e) }, 500);
  }
});
