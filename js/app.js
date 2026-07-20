// Controlador de flujo: inicio -> 5 misiones -> carta de personaje.
// Mantiene el estado del jugador y la barra de progreso. No conoce el interior
// de cada mision: solo llama render(container, state) y espera completeMission().

import { CONFIG, getSesion } from "./config.js";
import { MISIONES } from "./data.js";
import { conectarSesion, publicarEvento } from "./supabase.js";

import { renderInicio } from "./missions/inicio.js";
import { renderArsenal } from "./missions/m1-arsenal.js";
import { renderArbol } from "./missions/m2-arbol.js";
import { renderAlucinaciones } from "./missions/m3-alucinaciones.js";
import { renderJugada } from "./missions/m4-jugada.js";
import { renderPrompt } from "./missions/m5-prompt.js";
import { renderCarta } from "./missions/carta.js";

const screen = document.getElementById("screen");
const progressEl = document.getElementById("progress");
document.getElementById("session-pill").textContent = getSesion();

// Secuencia de pasos. inicio y carta no cuentan en la barra de progreso.
const MISION_RENDER = {
  m1: renderArsenal,
  m2: renderArbol,
  m3: renderAlucinaciones,
  m4: renderJugada,
  m5: renderPrompt,
};

const state = {
  sesion: getSesion(),
  jugador: { nombre: "", equipo: "", email: "" },
  respuestas: {},
  indiceActual: -1, // -1 = inicio

  // Cada mision llama esto al terminar.
  completeMission(id, resultado) {
    this.respuestas[id] = resultado;
    publicarEvento(this.sesion, {
      tipo: "mision_completa",
      jugador: this.jugador.nombre || "Anonimo",
      mision: id,
      resultado,
    });
    this.siguiente();
  },

  siguiente() {
    this.indiceActual += 1;
    if (this.indiceActual >= MISIONES.length) {
      pintarProgreso(MISIONES.length);
      renderCarta(screen, this);
      return;
    }
    const mision = MISIONES[this.indiceActual];
    pintarProgreso(this.indiceActual);
    MISION_RENDER[mision.id](screen, this);
    window.scrollTo(0, 0);
  },
};

function pintarProgreso(indice) {
  progressEl.innerHTML = "";
  MISIONES.forEach((_, i) => {
    const seg = document.createElement("div");
    seg.className = "seg" + (i < indice ? " done" : i === indice ? " current" : "");
    progressEl.appendChild(seg);
  });
}

// Arranque
async function iniciar() {
  await conectarSesion(state.sesion);
  progressEl.innerHTML = "";
  renderInicio(screen, state, () => {
    publicarEvento(state.sesion, { tipo: "jugador_entra", jugador: state.jugador.nombre });
    state.siguiente();
  });
}

iniciar();

export { CONFIG };
