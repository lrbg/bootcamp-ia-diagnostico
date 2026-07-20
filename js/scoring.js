// Calcula las 4 dimensiones (0-100) desde las respuestas y decide el arquetipo.
import { HERRAMIENTAS, COFRES, NODOS_SKILL, ESCENARIOS, PROMPT_RETO, ARQUETIPOS } from "./data.js";

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const pesoCofre = (id) => (COFRES.find((c) => c.id === id)?.peso ?? 0);

export function calcularDimensiones(respuestas) {
  const r = respuestas || {};

  // --- Explorador: amplitud del arsenal (m1) ---
  let sumaPeso = 0;
  const asign = r.m1?.asignaciones || {};
  Object.entries(asign).forEach(([, cofre]) => { sumaPeso += pesoCofre(cofre); });
  const extras = (r.m1?.extras || []).length;
  const explorRaw = sumaPeso + Math.min(extras, 3) * 0.5;
  const explorador = clamp((explorRaw / HERRAMIENTAS.length) * 100);

  // --- Constructor: arbol (m2) + prompt (m5) ---
  const niveles = r.m2?.niveles || {};
  const sumaNiveles = Object.values(niveles).reduce((a, b) => a + b, 0);
  const treeScore = sumaNiveles / (NODOS_SKILL.length * 4); // 0..1
  const totalCorr = r.m5?.totalCorrectas || PROMPT_RETO.piezas.filter((p) => p.correcta).length;
  const promptScore = Math.max(0, ((r.m5?.correctas || 0) - (r.m5?.errores || 0)) / totalCorr); // 0..1
  const constructor = clamp((treeScore * 0.6 + promptScore * 0.4) * 100);

  // --- m4: sumas de integrador y esceptico contra su maximo posible ---
  const maxInt = ESCENARIOS.reduce((a, e) => a + Math.max(...e.opciones.map((o) => o.integrador)), 0);
  const maxEsc = ESCENARIOS.reduce((a, e) => a + Math.max(...e.opciones.map((o) => o.esceptico)), 0);
  const elecciones = r.m4?.escenarios || [];
  const sumInt = elecciones.reduce((a, x) => a + (x.integrador || 0), 0);
  const sumEscM4 = elecciones.reduce((a, x) => a + (x.esceptico || 0), 0);
  const intM4 = maxInt ? sumInt / maxInt : 0;
  const escM4 = maxEsc ? sumEscM4 / maxEsc : 0;

  // --- Esceptico: caza de alucinaciones (m3) + criterio (m4) ---
  const rondas = r.m3?.rondas || [];
  const aciertos = rondas.reduce((a, x) => a + (x.aciertos || 0), 0);
  const totalClaims = rondas.reduce((a, x) => a + (x.total || 0), 0);
  const alucScore = totalClaims ? aciertos / totalClaims : 0;
  const esceptico = clamp((alucScore * 0.6 + escM4 * 0.4) * 100);

  // --- Integrador: IA en el trabajo real (m4) ---
  const integrador = clamp(intM4 * 100);

  return { explorador, constructor, esceptico, integrador };
}

// Prioridad de desempate: favorece la madurez.
const PRIORIDAD = ["integrador", "esceptico", "constructor", "explorador"];

export function calcularArquetipo(dimensiones) {
  let mejor = PRIORIDAD[0];
  PRIORIDAD.forEach((k) => {
    if (dimensiones[k] > dimensiones[mejor]) mejor = k;
  });
  return { clave: mejor, ...ARQUETIPOS[mejor] };
}
