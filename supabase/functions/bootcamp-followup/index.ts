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
const LIMITE_DIAS = 3;
const DIA = 86400000;

// Fase 2: progresion (espejo de js/data.js + js/nivelacion.js).
const XP_POR_NIVEL = 100;
const RANGOS = [
  { nivel: 1, nombre: "Novato", min: 0 }, { nivel: 2, nombre: "Aprendiz", min: 200 },
  { nivel: 3, nombre: "Practico", min: 500 }, { nivel: 4, nombre: "Maestro", min: 900 },
];
const RETOS_POR_AREA: Record<string, Array<Record<string, string>>> = {
  "Herramientas": [
    { titulo: "Compara 3 herramientas", accion: "Resuelve una misma tarea real con 3 IAs distintas y anota cual gano y por que.", recurso: "Comparativa de modelos por tipo de tarea.", practica: "Documenta la comparacion en 5 lineas." },
    { titulo: "Arma tu stack personal", accion: "Define que herramienta usas para cada tipo de tarea y conviertelo en tu flujo.", recurso: "Ejemplos de stacks de IA por rol.", practica: "Comparte tu stack con el equipo." },
  ],
  "Skills": [
    { titulo: "Aplica el skill en un caso real", accion: "Aplica el skill que reforzaste a un problema real de tu trabajo.", recurso: "Tutorial intermedio del tema.", practica: "Muestra el resultado concreto." },
    { titulo: "Ensena el skill", accion: "Explicalo a un companero o escribe una mini-guia de una pagina.", recurso: "Como estructurar una explicacion clara.", practica: "Comparte la guia." },
  ],
  "Pensamiento critico": [
    { titulo: "Detecta y corrige", accion: "Encuentra un dato inventado de una IA y corrigelo con fuente.", recurso: "Tecnicas para pedir citas y verificar.", practica: "Documenta el error y su correccion." },
    { titulo: "Tu checklist de verificacion", accion: "Crea la lista de lo que SIEMPRE verificas antes de usar output de IA.", recurso: "Ejemplos de checklists.", practica: "Usala una semana." },
  ],
  "Criterio / riesgo": [
    { titulo: "Define tu linea roja de datos", accion: "Lista que datos NUNCA metes a una IA publica y por que.", recurso: "Basico de privacidad con IA.", practica: "Compartelo con tu equipo." },
    { titulo: "Caso de uso seguro", accion: "Redisena un flujo real anonimizando datos para usar IA sin riesgo.", recurso: "Tecnicas de anonimizacion.", practica: "Documenta el antes/despues." },
  ],
  "Prompting": [
    { titulo: "Prompt con ejemplos", accion: "Mejora un prompt agregando 2 ejemplos de entrada y salida.", recurso: "Few-shot prompting.", practica: "Compara resultado con y sin ejemplos." },
    { titulo: "Cadena de prompts", accion: "Resuelve una tarea compleja en 3 prompts encadenados.", recurso: "Prompt chaining.", practica: "Documenta la cadena." },
  ],
  "Integracion": [
    { titulo: "Automatiza un paso", accion: "Delega un paso repetitivo a IA de forma estable.", recurso: "Casos de automatizacion por rol.", practica: "Mide el tiempo ahorrado." },
    { titulo: "Integra al flujo del equipo", accion: "Propon como el equipo puede usar IA en un proceso comun.", recurso: "Playbooks de adopcion.", practica: "Presenta la propuesta." },
  ],
  "Dimension": [
    { titulo: "Sube un escalon", accion: "Ponte un reto concreto en tu punto mas debil esta semana.", recurso: "Material del tema.", practica: "Muestra tu avance." },
    { titulo: "Consolida", accion: "Repite el reto en un contexto distinto para afianzar.", recurso: "Ejercicios avanzados.", practica: "Documenta el resultado." },
  ],
};
const xpDe = (ts: any[]) => ts.filter((t) => t.estado === "cumplida").reduce((a, t) => a + (t.nivel || 1) * XP_POR_NIVEL, 0);
const rangoDe = (xp: number) => { let r = RANGOS[0]; for (const x of RANGOS) if (xp >= x.min) r = x; return r; };

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
    let evaluadas = 0, recordatorios = 0, retosNuevos = 0, subidas = 0;
    const lista = (tareas || []) as any[];

    // Snapshot de nivel por participante (para detectar subida de rango).
    const porNombre: Record<string, any[]> = {};
    for (const t of lista) (porNombre[t.participante] = porNombre[t.participante] || []).push(t);
    const nivelAntes: Record<string, number> = {};
    for (const [n, ts] of Object.entries(porNombre)) nivelAntes[n] = rangoDe(xpDe(ts)).nivel;

    for (const t of lista) {
      // 1) Evaluar entregas sin revisar
      if (t.estado === "entregada" && !t.evaluacion) {
        let evalr;
        if (t.tipo === "tecnico") {
          evalr = await evaluarTecnico(openaiKey, t);   // estructural + (si hay) OpenAI
        } else if (openaiKey) {
          evalr = await evaluarConOpenAI(openaiKey, t);
        } else {
          continue; // sin OpenAI no se puede evaluar una tarea de texto libre
        }
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
        // Fase 2: desbloquear siguiente reto del area al cumplir (retos del plan, no los tecnicos).
        if (evalr.cumple && t.tipo !== "tecnico") {
          const nuevo = await crearSiguienteReto(supa, lista, t);
          if (nuevo) {
            retosNuevos++;
            if (t.email) await enviarCorreo({
              tipo: "reto", to: t.email, nombre: t.participante,
              tarea: nuevo.paso.titulo, accion: nuevo.paso.accion,
              link: linkSeguimiento(body.base_url, t.sesion, t.participante),
            });
          }
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

    // Fase 2: detectar subidas de rango (XP cambio por las nuevas cumplidas).
    const porNombre2: Record<string, any[]> = {};
    for (const t of lista) (porNombre2[t.participante] = porNombre2[t.participante] || []).push(t);
    for (const [n, ts] of Object.entries(porNombre2)) {
      const nivel = rangoDe(xpDe(ts)).nivel;
      const email = ts.find((x) => x.email)?.email;
      if (nivelAntes[n] !== undefined && nivel > nivelAntes[n] && email) {
        subidas++;
        await enviarCorreo({
          tipo: "nivel", to: email, nombre: n, rango: rangoDe(xpDe(ts)).nombre,
          link: linkSeguimiento(body.base_url, ts[0].sesion, n),
        });
      }
    }

    return respond({ ok: true, revisadas: lista.length, evaluadas, recordatorios, retosNuevos, subidas });
  } catch (e) {
    return respond({ ok: false, error: String(e) }, 500);
  }
});

function linkSeguimiento(base: string | undefined, sesion: string, participante: string): string {
  if (!base) return "";
  return `${base}/seguimiento.html?sesion=${encodeURIComponent(sesion)}&u=${encodeURIComponent(participante)}`;
}

// Crea (inserta) el siguiente reto del area si existe y no esta ya creado.
async function crearSiguienteReto(supa: any, lista: any[], t: any) {
  const area = t.area || "Dimension";
  const nivelActual = t.nivel || 1;
  const ladder = RETOS_POR_AREA[area] || RETOS_POR_AREA["Dimension"];
  const contenido = ladder[nivelActual - 1];
  if (!contenido) return null;
  const nuevoNivel = nivelActual + 1;
  if (lista.some((x) => x.participante === t.participante && x.area === area && x.nivel === nuevoNivel)) return null;
  const maxOrden = lista.filter((x) => x.participante === t.participante).reduce((m, x) => Math.max(m, x.orden || 0), 0);
  const nuevo = {
    id: crypto.randomUUID(), sesion: t.sesion, participante: t.participante, email: t.email,
    arquetipo: t.arquetipo, orden: maxOrden + 1, paso: { ...contenido, area, prioridad: "media" },
    area, nivel: nuevoNivel, estado: "pendiente", creada_at: new Date().toISOString(),
    fecha_limite: new Date(Date.now() + LIMITE_DIAS * DIA).toISOString(),
    respuesta: null, entregada_at: null, evaluacion: null, recordatorios: 0, ultimo_recordatorio_at: null,
  };
  const { error } = await supa.from("bootcamp_tareas").insert(nuevo);
  if (error) return null;
  lista.push(nuevo);
  return nuevo;
}

// Reto tecnico: chequeos estructurales (siempre) + revision semantica con OpenAI (si hay).
async function evaluarTecnico(key: string | undefined, t: any) {
  const codigo = (t.respuesta || "").toLowerCase();
  const criterios = (t.criterios || []).map((c: any) => {
    const any = (c.any || []).some((k: string) => codigo.includes(k.toLowerCase()));
    const all = (c.all || []).length ? c.all.every((k: string) => codigo.includes(k.toLowerCase())) : true;
    return { nombre: c.nombre, ok: any && all && codigo.length >= 20 };
  });
  const pasados = criterios.filter((r: any) => r.ok).length;
  const total = criterios.length || 1;
  let cumple = codigo.length >= 30 && pasados >= Math.ceil(total * 0.75);
  let feedback = cumple
    ? `Tu solucion cubre ${pasados}/${total} criterios.`
    : `Cubres ${pasados}/${total} criterios. Falta: ${criterios.filter((r: any) => !r.ok).map((r: any) => r.nombre).join("; ")}.`;

  if (key && codigo.length >= 30) {
    try {
      const system = "Eres revisor de un reto tecnico de un bootcamp de IA. Evalua el codigo/flujo del participante " +
        "contra los criterios. Se justo pero exigente. Responde SOLO JSON: {\"cumple\": boolean, \"feedback\": string (2-3 frases, español, que hizo bien y que falta)}.";
      const user = `Reto: ${t.paso?.titulo}\nEnunciado: ${t.paso?.accion}\nCriterios: ${(t.criterios || []).map((c: any) => c.nombre).join("; ")}\n\nSolucion del participante:\n${t.respuesta}`;
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.3, response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      const data = await r.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      if (typeof parsed.cumple === "boolean") cumple = parsed.cumple;
      if (parsed.feedback) feedback = parsed.feedback;
    } catch { /* si OpenAI falla, se queda la evaluacion estructural */ }
  }

  return { cumple, veredicto: cumple ? "cumplida" : "rehacer", feedback, criterios, modelo: key ? "gpt-4o-mini+estructural" : "estructural", at: new Date().toISOString() };
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
