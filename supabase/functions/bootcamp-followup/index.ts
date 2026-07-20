// Edge Function: revisor de tareas del Bootcamp IA (cron + manual).
// - Evalua con OpenAI las tareas entregadas sin revisar (cumple/no cumple + feedback).
// - Manda recordatorios (Bootcamp IA) a los que no entregaron y ya vencieron.
// Reusa el proyecto de Polibio: OPENAI_API_KEY, RESEND_API_KEY y service role.
//
// Deploy: supabase functions deploy bootcamp-followup --project-ref hyylhendjtwdtflzsjdx --no-verify-jwt
// Lo dispara el cron (GitHub Actions) con header x-cron-secret, o el admin manualmente.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RECORDATORIO_DIAS = 1;
const MAX_RECORDATORIOS = 3;
const DIA = 86400000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const respond = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });

  try {
    const appKey = Deno.env.get("BOOTCAMP_APP_KEY");
    const gotKey = req.headers.get("x-bootcamp-key") || req.headers.get("x-cron-secret");
    if (appKey && gotKey !== appKey) return respond({ ok: false, error: "No autorizado" }, 401);

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supa = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const emailFn = `${supaUrl}/functions/v1/bootcamp-email`;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const body = await req.json().catch(() => ({}));
    let q = supa.from("bootcamp_tareas").select("*");
    if (body.sesion) q = q.eq("sesion", body.sesion);
    const { data: tareas, error } = await q;
    if (error) return respond({ ok: false, error: error.message }, 500);

    const enviarCorreo = (payload: Record<string, unknown>) =>
      fetch(emailFn, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", Authorization: `Bearer ${anon}`, apikey: anon,
          ...(appKey ? { "x-bootcamp-key": appKey } : {}),
        },
        body: JSON.stringify(payload),
      }).catch(() => null);

    const now = Date.now();
    let evaluadas = 0, recordatorios = 0;

    for (const t of tareas || []) {
      // 1) Evaluar entregas sin revisar
      if (t.estado === "entregada" && !t.evaluacion && openaiKey) {
        const evalr = await evaluarConOpenAI(openaiKey, t);
        t.evaluacion = evalr;
        t.estado = evalr.cumple ? "cumplida" : "rehacer";
        evaluadas++;
        await supa.from("bootcamp_tareas").update({ evaluacion: t.evaluacion, estado: t.estado }).eq("id", t.id);
        if (t.email) {
          await enviarCorreo({
            tipo: "evaluacion", to: t.email, nombre: t.participante,
            tarea: t.paso?.titulo, veredicto: evalr.veredicto, feedback: evalr.feedback,
            link: linkSeguimiento(body.base_url, t.sesion, t.participante),
          });
        }
        continue;
      }

      // 2) Recordatorios a vencidos sin entregar
      const sinEntregar = ["pendiente", "rehacer", "vencida"].includes(t.estado);
      const vencida = now > new Date(t.fecha_limite).getTime();
      if (sinEntregar && vencida) {
        const nuevoEstado = t.estado === "rehacer" ? "rehacer" : "vencida";
        const puede = (t.recordatorios || 0) < MAX_RECORDATORIOS &&
          (!t.ultimo_recordatorio_at || now - new Date(t.ultimo_recordatorio_at).getTime() >= RECORDATORIO_DIAS * DIA);
        if (puede && t.email) {
          const rec = (t.recordatorios || 0) + 1;
          await supa.from("bootcamp_tareas").update({
            recordatorios: rec, ultimo_recordatorio_at: new Date().toISOString(), estado: nuevoEstado,
          }).eq("id", t.id);
          recordatorios++;
          await enviarCorreo({
            tipo: "recordatorio", to: t.email, nombre: t.participante,
            tarea: t.paso?.titulo, accion: t.paso?.accion, intento: rec,
            link: linkSeguimiento(body.base_url, t.sesion, t.participante),
          });
        } else if (t.estado !== nuevoEstado) {
          await supa.from("bootcamp_tareas").update({ estado: nuevoEstado }).eq("id", t.id);
        }
      }
    }

    return respond({ ok: true, revisadas: (tareas || []).length, evaluadas, recordatorios });
  } catch (e) {
    return respond({ ok: false, error: String(e) }, 500);
  }
});

function linkSeguimiento(base: string | undefined, sesion: string, participante: string): string {
  if (!base) return "";
  return `${base}/seguimiento.html?sesion=${encodeURIComponent(sesion)}&u=${encodeURIComponent(participante)}`;
}

async function evaluarConOpenAI(key: string, t: any) {
  const system = "Eres el revisor de tareas de un bootcamp de IA. Evalua si la respuesta del participante cumple la tarea. " +
    "Sé justo pero exigente: pide concrecion (ejemplo real y resultado). Responde SOLO JSON: " +
    '{"cumple": boolean, "feedback": string (2-3 frases, en español, tono cercano)}.';
  const user = `Tarea: ${t.paso?.titulo}\nQue debia hacer: ${t.paso?.accion}\nPractica pedida: ${t.paso?.practica}\n\nRespuesta del participante:\n${t.respuesta || "(vacia)"}`;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini", temperature: 0.3, response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    const data = await r.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    return {
      cumple: !!parsed.cumple,
      veredicto: parsed.cumple ? "cumplida" : "rehacer",
      feedback: parsed.feedback || "Sin feedback.",
      modelo: "gpt-4o-mini",
      at: new Date().toISOString(),
    };
  } catch (e) {
    return { cumple: false, veredicto: "rehacer", feedback: "No se pudo evaluar automaticamente: " + String(e), modelo: "error", at: new Date().toISOString() };
  }
}
