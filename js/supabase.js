// Capa de datos. Dos ramas:
//  - MOCK_MODE (default): usa BroadcastChannel + localStorage para que el tablero
//    en vivo funcione entre pestañas sin backend.
//  - Real: cliente Supabase (Realtime broadcast para el tablero, insert para el resultado).

import { CONFIG } from "./config.js";

let canalMock = null;   // BroadcastChannel
let canalReal = null;   // Supabase RealtimeChannel
let supa = null;        // cliente supabase

const LS_KEY = (sesion) => `bootcamp_resultados_${sesion}`;

// --- Conexion (jugador y facilitador la llaman al entrar) ---
export async function conectarSesion(sesion) {
  if (CONFIG.MOCK_MODE) {
    canalMock = new BroadcastChannel(`bootcamp:${sesion}`);
    return;
  }
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  supa = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  canalReal = supa.channel(`sesion:${sesion}`, { config: { broadcast: { self: false } } });
  await canalReal.subscribe();
}

// --- Publicar evento ligero para el tablero en vivo ---
export function publicarEvento(sesion, evento) {
  const payload = { ...evento, ts: Date.now() };
  if (CONFIG.MOCK_MODE) {
    if (canalMock) canalMock.postMessage({ clase: "evento", payload });
    return;
  }
  if (canalReal) canalReal.send({ type: "broadcast", event: "evento", payload });
}

// --- Suscribirse a eventos (lo usa el facilitador) ---
export function suscribirEventos(sesion, onEvento) {
  if (CONFIG.MOCK_MODE) {
    if (!canalMock) canalMock = new BroadcastChannel(`bootcamp:${sesion}`);
    canalMock.onmessage = (m) => {
      const { clase, payload } = m.data || {};
      if (clase === "evento") onEvento(payload);
      if (clase === "resultado") onEvento({ tipo: "resultado", registro: payload });
    };
    return;
  }
  if (!canalReal) return;
  canalReal.on("broadcast", { event: "evento" }, (m) => onEvento(m.payload));
  canalReal.on("broadcast", { event: "resultado" }, (m) => onEvento({ tipo: "resultado", registro: m.payload }));
}

// --- Guardar resultado final del jugador ---
export async function guardarResultado(sesion, registro) {
  const fila = { ...registro, sesion };
  if (CONFIG.MOCK_MODE) {
    const prev = leerLocal(sesion);
    prev.push({ ...fila, created_at: new Date().toISOString() });
    localStorage.setItem(LS_KEY(sesion), JSON.stringify(prev));
    if (canalMock) canalMock.postMessage({ clase: "resultado", payload: fila });
    return { ok: true, mock: true };
  }
  const { error } = await supa.from(CONFIG.TABLA).insert({
    nombre: registro.nombre,
    equipo: registro.equipo,
    email: registro.email || null,
    respuestas: registro.respuestas,
    dimensiones: registro.dimensiones,
    arquetipo: registro.arquetipo,
  });
  // Ademas emite por broadcast para refrescar el tablero al instante.
  if (canalReal) canalReal.send({ type: "broadcast", event: "resultado", payload: fila });
  return { ok: !error, error };
}

// --- Leer resultados acumulados (agregados del facilitador) ---
export async function leerResultados(sesion) {
  if (CONFIG.MOCK_MODE) return leerLocal(sesion);
  const { data, error } = await supa
    .from(CONFIG.TABLA)
    .select("id,nombre,equipo,email,dimensiones,arquetipo,respuestas,created_at")
    .order("created_at", { ascending: false });
  return error ? [] : data;
}

function leerLocal(sesion) {
  try { return JSON.parse(localStorage.getItem(LS_KEY(sesion))) || []; }
  catch { return []; }
}

// ===================== Tareas de seguimiento =====================
const LS_TAREAS = (sesion) => `bootcamp_tareas_${sesion}`;
const LS_CORREOS = (sesion) => `bootcamp_emails_${sesion}`;

export async function leerTareas(sesion) {
  if (CONFIG.MOCK_MODE) {
    try { return JSON.parse(localStorage.getItem(LS_TAREAS(sesion))) || []; } catch { return []; }
  }
  const { data, error } = await supa.from("bootcamp_tareas").select("*").eq("sesion", sesion);
  return error ? [] : data;
}

// Guarda el arreglo completo de tareas (mock) o hace upsert (real).
export async function guardarTareas(sesion, tareas) {
  if (CONFIG.MOCK_MODE) {
    localStorage.setItem(LS_TAREAS(sesion), JSON.stringify(tareas));
    return { ok: true, mock: true };
  }
  const { error } = await supa.from("bootcamp_tareas").upsert(tareas, { onConflict: "id" });
  return { ok: !error, error };
}

export async function actualizarTarea(sesion, tarea) {
  if (CONFIG.MOCK_MODE) {
    const arr = await leerTareas(sesion);
    const i = arr.findIndex((t) => t.id === tarea.id);
    if (i >= 0) arr[i] = tarea; else arr.push(tarea);
    localStorage.setItem(LS_TAREAS(sesion), JSON.stringify(arr));
    return { ok: true, mock: true };
  }
  const { error } = await supa.from("bootcamp_tareas").update(tarea).eq("id", tarea.id);
  return { ok: !error, error };
}

// ===================== Correo (Resend via Edge Function) =====================
// payload: { tipo, to, nombre, asunto, plan|tarea|... }
export async function enviarCorreo(sesion, payload) {
  const registro = { ...payload, enviado_at: new Date().toISOString() };
  if (CONFIG.MOCK_MODE) {
    // Mock: no envia de verdad, lo apila para que el admin vea el "buzon".
    const log = leerCorreosLocal(sesion);
    log.unshift(registro);
    localStorage.setItem(LS_CORREOS(sesion), JSON.stringify(log));
    return { ok: true, mock: true };
  }
  const url = `${CONFIG.SUPABASE_URL}/functions/v1/${CONFIG.EDGE_EMAIL_FN}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`, apikey: CONFIG.SUPABASE_ANON_KEY,
      "x-bootcamp-key": CONFIG.APP_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok && data.ok !== false, error: data.error };
}

export function leerCorreosLocal(sesion) {
  try { return JSON.parse(localStorage.getItem(LS_CORREOS(sesion))) || []; } catch { return []; }
}

// Dispara la revision del lado servidor (cron/manual real). En mock no hace nada:
// la revision corre en el cliente (js/tareas.js).
export async function ejecutarRevisionServidor(sesion) {
  if (CONFIG.MOCK_MODE) return { ok: true, mock: true };
  const url = `${CONFIG.SUPABASE_URL}/functions/v1/${CONFIG.EDGE_FOLLOWUP_FN}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`, apikey: CONFIG.SUPABASE_ANON_KEY,
      "x-bootcamp-key": CONFIG.APP_KEY,
    },
    body: JSON.stringify({ sesion, base_url: CONFIG.BASE_URL || location.origin }),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, ...data };
}
