// Cliente del plan de trabajo. En real llama a la Edge Function (OpenAI);
// en mock arma un plan de ejemplo local desde el diagnostico, sin OpenAI.
import { CONFIG } from "./config.js";
import { diagnosticar, resumenParaPlan } from "./diagnostico.js";

// registro: { nombre, arquetipo, dimensiones, respuestas }
export async function generarPlan(registro) {
  const hallazgos = diagnosticar(registro.respuestas, registro.dimensiones);
  const resumen = resumenParaPlan(registro.nombre, registro.dimensiones, registro.arquetipo, hallazgos);

  // Mock: no toca OpenAI. Sirve para probar todo el flujo.
  if (CONFIG.MOCK_MODE || CONFIG.MOCK_PLAN) {
    return { ok: true, mock: true, hallazgos, plan: planMock(hallazgos, registro) };
  }

  // Real: Edge Function en el Supabase de Polibio.
  const url = `${CONFIG.SUPABASE_URL}/functions/v1/${CONFIG.EDGE_PLAN_FN}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      apikey: CONFIG.SUPABASE_ANON_KEY,
      "x-bootcamp-key": CONFIG.APP_KEY,
    },
    body: JSON.stringify({ nombre: registro.nombre, arquetipo: registro.arquetipo, resumen }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.plan) {
    return { ok: false, hallazgos, error: data.error || `HTTP ${resp.status}`, detalle: data.detalle };
  }
  return { ok: true, hallazgos, plan: data.plan };
}

// --- Plan de ejemplo determinista (mock) ---
const PLANTILLA = {
  "Herramientas": {
    titulo: "Amplia y usa tu arsenal",
    accion: "Elige 2 herramientas que no dominas y usalas en una tarea real esta semana.",
    recurso: "Guias de inicio rapido de Claude y ChatGPT; un video corto por herramienta.",
    practica: "Resuelve una tarea de tu trabajo con cada una y compara resultados.",
  },
  "Skills": {
    titulo: "Sube de nivel en tus skills flojos",
    accion: "Dedica una sesion a los temas que marcaste como debiles.",
    recurso: "Mini curso o tutorial practico de RAG / agentes / prompting segun tu caso.",
    practica: "Arma un ejemplo minimo funcionando (no solo teoria).",
  },
  "Pensamiento critico": {
    titulo: "Verifica antes de confiar",
    accion: "Adopta la regla: toda cifra o dato de IA se valida en la fuente.",
    recurso: "Lee sobre alucinaciones de LLM y como pedir que citen fuentes.",
    practica: "En tu proximo uso, marca 1 dato dudoso y verificalo antes de usarlo.",
  },
  "Criterio / riesgo": {
    titulo: "Cuida los datos sensibles",
    accion: "Define que NUNCA pegas en una IA publica (datos personales, financieros).",
    recurso: "Politica basica de manejo de datos con IA en tu equipo.",
    practica: "Anonimiza un caso real antes de pedir ayuda a la IA.",
  },
  "Prompting": {
    titulo: "Prompt con estructura",
    accion: "Usa siempre: rol + contexto + formato + restricciones.",
    recurso: "Plantilla de prompt de 4 partes; ejemplos buenos vs malos.",
    practica: "Reescribe 3 prompts que usas seguido con esa estructura.",
  },
  "Integracion": {
    titulo: "Mete IA a tu dia a dia",
    accion: "Identifica una tarea repetitiva y delega el borrador a la IA.",
    recurso: "Casos de uso de IA por rol (QA, dev, soporte, ventas).",
    practica: "Automatiza un paso de tu flujo esta semana.",
  },
  "Dimension": {
    titulo: "Refuerza tu punto mas bajo",
    accion: "Enfoca practica en la dimension con menor nivel.",
    recurso: "Material del tema correspondiente del bootcamp.",
    practica: "Una tarea concreta que ejercite esa dimension.",
  },
};

function planMock(hallazgos, registro) {
  // Un paso por area (las mas severas primero), max 4.
  const areas = [];
  hallazgos.forEach((h) => { if (!areas.find((a) => a.area === h.area)) areas.push(h); });
  const pasos = areas.slice(0, 4).map((h) => ({
    ...(PLANTILLA[h.area] || PLANTILLA["Dimension"]),
    area: PLANTILLA[h.area] ? h.area : "Dimension",
    prioridad: h.severidad,
  }));
  if (!pasos.length) {
    pasos.push({ ...PLANTILLA["Skills"], titulo: "Sube de nivel", prioridad: "baja" });
  }
  const fallasTxt = hallazgos.length
    ? hallazgos.slice(0, 3).map((h) => h.titulo.toLowerCase()).join(", ")
    : "buen nivel general";
  return {
    objetivo: `Que ${registro.nombre || "el participante"} crezca en sus puntos debiles y use IA con mas criterio y soltura.`,
    resumen_fallas: `Principales areas a mejorar: ${fallasTxt}.`,
    pasos,
    cierre: "Revisa tu avance en 2 semanas y vuelve a hacer el diagnostico para medir progreso.",
  };
}
