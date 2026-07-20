// Diagnostico determinista: de las respuestas + dimensiones saca QUE le falla
// al usuario, sin IA. Esto es lo que el admin ve tal cual, y tambien lo que
// alimenta al plan de trabajo generado con OpenAI.
import { HERRAMIENTAS, NODOS_SKILL, ESCENARIOS, PROMPT_RETO } from "./data.js";

const DIM_LABEL = {
  integrador: "Integrador",
  esceptico: "Esceptico",
  explorador: "Explorador",
  constructor: "Constructor",
};

// Devuelve una lista de hallazgos { area, severidad: alta|media|baja, titulo, detalle }.
export function diagnosticar(respuestas, dimensiones) {
  const r = respuestas || {};
  const hallazgos = [];

  // --- Arsenal (m1): exposicion practica ---
  const asign = r.m1?.asignaciones || {};
  const diario = Object.values(asign).filter((c) => c === "diario").length;
  const desconoce = Object.values(asign).filter((c) => c === "desconozco").length;
  if (diario <= 1) {
    hallazgos.push({ area: "Herramientas", severidad: "alta", titulo: "Poca practica diaria con IA",
      detalle: `Solo usa ${diario} herramienta(s) a diario. Le falta volverla parte del flujo de trabajo.` });
  }
  if (desconoce >= 5) {
    hallazgos.push({ area: "Herramientas", severidad: "media", titulo: "Panorama de herramientas limitado",
      detalle: `Desconoce ${desconoce} de ${HERRAMIENTAS.length} herramientas. Conviene ampliar su radar.` });
  }

  // --- Skills (m2): nodos con dominio bajo ---
  const niveles = r.m2?.niveles || {};
  const flojos = NODOS_SKILL.filter((n) => (niveles[n.id] ?? 0) <= 1);
  if (flojos.length) {
    hallazgos.push({ area: "Skills", severidad: flojos.length >= 3 ? "alta" : "media",
      titulo: "Skills tecnicos por desarrollar",
      detalle: "Dominio bajo en: " + flojos.map((n) => n.nombre).join(", ") + "." });
  }

  // --- Alucinaciones (m3): pensamiento critico ---
  const rondas = r.m3?.rondas || [];
  const aciertos = rondas.reduce((a, x) => a + (x.aciertos || 0), 0);
  const totalClaims = rondas.reduce((a, x) => a + (x.total || 0), 0);
  if (totalClaims && aciertos < totalClaims) {
    hallazgos.push({ area: "Pensamiento critico", severidad: aciertos < totalClaims / 2 ? "alta" : "media",
      titulo: "No detecta todas las alucinaciones",
      detalle: `Acerto ${aciertos}/${totalClaims}. Riesgo de creerle a la IA sin verificar.` });
  }

  // --- Jugada real (m4): criterio de riesgo e integracion ---
  const elecciones = r.m4?.escenarios || [];
  elecciones.forEach((e, i) => {
    const esc = ESCENARIOS[i];
    if (!esc) return;
    if ((e.esceptico || 0) === 0) {
      hallazgos.push({ area: "Criterio / riesgo", severidad: "alta",
        titulo: "Decision riesgosa con IA",
        detalle: `En "${esc.situacion}" eligio una opcion de bajo criterio (datos/verificacion).` });
    } else if ((e.integrador || 0) === 0 && (e.esceptico || 0) <= 1) {
      hallazgos.push({ area: "Integracion", severidad: "baja",
        titulo: "No aprovecha IA donde podria",
        detalle: `En "${esc.situacion}" no considero usar IA.` });
    }
  });

  // --- Prompting (m5) ---
  const m5 = r.m5;
  if (m5) {
    const faltantes = (m5.totalCorrectas || 4) - (m5.correctas || 0);
    if (faltantes > 0 || (m5.errores || 0) > 0) {
      const partes = [];
      if (faltantes > 0) partes.push(`le faltaron ${faltantes} pieza(s) clave (rol/contexto/formato/restriccion)`);
      if ((m5.errores || 0) > 0) partes.push(`incluyo ${m5.errores} instruccion(es) vaga(s)`);
      hallazgos.push({ area: "Prompting", severidad: faltantes >= 2 ? "alta" : "media",
        titulo: "Prompting incompleto",
        detalle: "Al reparar el prompt, " + partes.join(" y ") + "." });
    }
  }

  // --- Dimensiones muy bajas (refuerzo) ---
  Object.entries(dimensiones || {}).forEach(([k, v]) => {
    if (v < 40) {
      hallazgos.push({ area: "Dimension", severidad: v < 25 ? "alta" : "baja",
        titulo: `${DIM_LABEL[k] || k} bajo (${v}/100)`,
        detalle: `Su nivel de ${DIM_LABEL[k] || k} esta por debajo del umbral.` });
    }
  });

  // Ordena por severidad (alta primero) y quita duplicados de area+titulo.
  const peso = { alta: 0, media: 1, baja: 2 };
  const vistos = new Set();
  return hallazgos
    .filter((h) => { const k = h.area + h.titulo; if (vistos.has(k)) return false; vistos.add(k); return true; })
    .sort((a, b) => peso[a.severidad] - peso[b.severidad]);
}

// Resumen compacto en texto para alimentar al modelo (el plan).
export function resumenParaPlan(nombre, dimensiones, arquetipo, hallazgos) {
  const dims = Object.entries(dimensiones || {})
    .map(([k, v]) => `${DIM_LABEL[k] || k}: ${v}/100`).join(", ");
  const fallas = hallazgos.length
    ? hallazgos.map((h) => `- [${h.severidad}] ${h.titulo}: ${h.detalle}`).join("\n")
    : "- Sin fallas notables; reforzar y subir de nivel.";
  return `Participante: ${nombre || "Anonimo"}
Arquetipo: ${arquetipo || "?"}
Dimensiones (0-100): ${dims}
Que le esta fallando:
${fallas}`;
}
