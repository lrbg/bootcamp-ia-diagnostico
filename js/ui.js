// Utilidades de UI compartidas por las misiones.
import { MISIONES } from "./data.js";

// Encabezado estandar de mision.
export function misionHeader(idMision, titulo, instruccion) {
  const num = MISIONES.findIndex((m) => m.id === idMision) + 1;
  return `
    <div class="mission-head">
      <span class="mission-tag"><i class="ti ti-target-arrow" aria-hidden="true"></i> Mision ${num} de ${MISIONES.length}</span>
      <h2>${titulo}</h2>
      <p class="mission-instruction">${instruccion}</p>
    </div>
  `;
}

// Bloque de accion inferior con boton de continuar.
export function accionContinuar(label = "Continuar", habilitado = false) {
  return `
    <div class="actions">
      <button class="btn" data-continuar disabled>${label} <i class="ti ti-arrow-right" aria-hidden="true"></i></button>
    </div>
  `;
}
