// Mision 2 - Arbol de habilidades.
// Cada nodo se auto-evalua con botones de nivel. La barra de XP se llena.
import { NODOS_SKILL, NIVELES_SKILL } from "../data.js";
import { misionHeader } from "../ui.js";

export function renderArbol(screen, state) {
  const niveles = {}; // idNodo -> valor (0..4)

  screen.innerHTML = `
    ${misionHeader("m2", "Arbol de habilidades", "Que tanto dominas cada una? Se honesto: no hay respuesta correcta.")}
    <div class="xp">
      <span>XP</span>
      <span class="xp-bar"><span id="xp-fill"></span></span>
      <span id="xp-count">0/${NODOS_SKILL.length}</span>
    </div>
    <div id="nodos"></div>
    <div class="actions">
      <button class="btn" id="continuar" disabled>Continuar <i class="ti ti-arrow-right" aria-hidden="true"></i></button>
    </div>
  `;

  const nodosEl = screen.querySelector("#nodos");
  const continuar = screen.querySelector("#continuar");
  const xpFill = screen.querySelector("#xp-fill");
  const xpCount = screen.querySelector("#xp-count");

  nodosEl.innerHTML = NODOS_SKILL.map((n) => `
    <div class="node" data-nodo="${n.id}">
      <div class="node-top">
        <h4>${n.nombre}</h4>
        <span class="node-level" data-level-label></span>
      </div>
      <p>${n.desc}</p>
      <div class="levels">
        ${NIVELES_SKILL.map((l) => `<button class="level-btn" data-nodo="${n.id}" data-valor="${l.valor}">${l.etiqueta}</button>`).join("")}
      </div>
    </div>
  `).join("");

  function actualizar() {
    NODOS_SKILL.forEach((n) => {
      const node = nodosEl.querySelector(`.node[data-nodo="${n.id}"]`);
      const valor = niveles[n.id];
      node.classList.toggle("rated", valor !== undefined);
      const label = node.querySelector("[data-level-label]");
      const nivel = NIVELES_SKILL.find((l) => l.valor === valor);
      label.textContent = nivel ? nivel.etiqueta : "";
      node.querySelectorAll(".level-btn").forEach((b) => {
        b.classList.toggle("on", Number(b.dataset.valor) === valor);
      });
    });

    const contestadas = Object.keys(niveles).length;
    const totalPuntos = Object.values(niveles).reduce((a, b) => a + b, 0);
    const maxPuntos = NODOS_SKILL.length * 4;
    xpCount.textContent = `${contestadas}/${NODOS_SKILL.length}`;
    xpFill.style.width = `${Math.round((totalPuntos / maxPuntos) * 100)}%`;
    continuar.disabled = contestadas < NODOS_SKILL.length;
  }

  nodosEl.querySelectorAll(".level-btn").forEach((b) => {
    b.addEventListener("click", () => {
      niveles[b.dataset.nodo] = Number(b.dataset.valor);
      actualizar();
    });
  });

  continuar.addEventListener("click", () => {
    state.completeMission("m2", { niveles });
  });

  actualizar();
}
