// Fase 2 - Progresion: calcula XP, rango y racha desde las tareas del participante.
// Todo se deriva de las tareas (no hay estado extra que sincronizar).
import { RANGOS, XP_POR_NIVEL, ARQUETIPOS } from "./data.js";

// XP total = suma de (nivel de la tarea * XP_POR_NIVEL) por cada tarea cumplida.
export function calcularXP(tareas) {
  return tareas
    .filter((t) => t.estado === "cumplida")
    .reduce((acc, t) => acc + (t.nivel || 1) * XP_POR_NIVEL, 0);
}

export function rangoPorXP(xp) {
  let actual = RANGOS[0];
  for (const r of RANGOS) if (xp >= r.min) actual = r;
  const idx = RANGOS.indexOf(actual);
  const siguiente = RANGOS[idx + 1] || null;
  const base = actual.min;
  const techo = siguiente ? siguiente.min : actual.min;
  const pct = siguiente ? Math.round(((xp - base) / (techo - base)) * 100) : 100;
  return { ...actual, siguiente, pct, faltanXP: siguiente ? siguiente.min - xp : 0 };
}

// Racha = tareas cumplidas consecutivas (por orden de entrega), contando desde la
// mas reciente hacia atras. Un "rehacer" o "vencida" rompe la cadena.
export function calcularRacha(tareas) {
  const evaluadas = tareas
    .filter((t) => t.entregada_at && (t.estado === "cumplida" || t.estado === "rehacer"))
    .sort((a, b) => new Date(a.entregada_at) - new Date(b.entregada_at));
  let racha = 0;
  for (let i = evaluadas.length - 1; i >= 0; i--) {
    if (evaluadas[i].estado === "cumplida") racha++;
    else break;
  }
  return racha;
}

// Resumen completo de progreso de un participante.
export function progresoDe(tareas, arquetipoClave) {
  const xp = calcularXP(tareas);
  const rango = rangoPorXP(xp);
  const racha = calcularRacha(tareas);
  const cumplidas = tareas.filter((t) => t.estado === "cumplida").length;
  const arq = ARQUETIPOS[arquetipoClave]?.nombre || arquetipoClave || "Participante";
  return { xp, rango, racha, cumplidas, total: tareas.length, titulo: `${arq} · ${rango.nombre}` };
}
