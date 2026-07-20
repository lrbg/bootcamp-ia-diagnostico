// Mision 4 - Tu jugada real.
// Escenarios de trabajo, un por pantalla. Elige como (o si) usarias IA.
// Mide integracion real y criterio (cuando NO usar IA).
import { ESCENARIOS } from "../data.js";
import { misionHeader } from "../ui.js";

export function renderJugada(screen, state) {
  const elecciones = []; // por escenario: { opcion, integrador, esceptico }
  let idx = 0;

  function pintar() {
    const esc = ESCENARIOS[idx];
    let seleccion = null;

    screen.innerHTML = `
      ${misionHeader("m4", "Tu jugada real", `Situacion ${idx + 1} de ${ESCENARIOS.length}. Elige lo que mas se parece a ti.`)}
      <div class="scenario">
        <div class="situacion">${esc.situacion}</div>
        <div id="opciones"></div>
      </div>
      <div class="actions">
        <button class="btn" id="continuar" disabled>Continuar <i class="ti ti-arrow-right" aria-hidden="true"></i></button>
      </div>
    `;

    const opcionesEl = screen.querySelector("#opciones");
    const continuar = screen.querySelector("#continuar");

    opcionesEl.innerHTML = esc.opciones.map((o, i) => `
      <button class="option" data-i="${i}">
        <span class="num">${i + 1}</span>
        <span>${o.texto}</span>
      </button>
    `).join("");

    opcionesEl.querySelectorAll(".option").forEach((btn) => {
      btn.addEventListener("click", () => {
        seleccion = Number(btn.dataset.i);
        opcionesEl.querySelectorAll(".option").forEach((b) => b.classList.toggle("on", b === btn));
        continuar.disabled = false;
      });
    });

    continuar.addEventListener("click", () => {
      const o = esc.opciones[seleccion];
      elecciones.push({ opcion: seleccion, integrador: o.integrador, esceptico: o.esceptico });
      if (idx === ESCENARIOS.length - 1) {
        state.completeMission("m4", { escenarios: elecciones });
      } else {
        idx++; pintar(); window.scrollTo(0, 0);
      }
    });
  }

  pintar();
}
