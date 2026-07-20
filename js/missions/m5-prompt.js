// Mision 5 - Desafio del prompt.
// Repara un prompt pobre eligiendo las piezas que lo hacen util.
// Mide prompting demostrado (no auto-declarado).
import { PROMPT_RETO } from "../data.js";
import { misionHeader } from "../ui.js";

export function renderPrompt(screen, state) {
  const elegidas = new Set();
  let validado = false;

  screen.innerHTML = `
    ${misionHeader("m5", "Desafio del prompt", PROMPT_RETO.instruccion)}
    <div class="bad-prompt">
      <div class="lbl">Prompt pobre</div>
      <div class="txt">"${PROMPT_RETO.malo}"</div>
    </div>
    <div id="piezas"></div>
    <div class="actions">
      <button class="btn" id="accion" disabled>Validar <i class="ti ti-check" aria-hidden="true"></i></button>
    </div>
  `;

  const piezasEl = screen.querySelector("#piezas");
  const accion = screen.querySelector("#accion");

  // Orden estable (no aleatorio para no romper resume/verificacion): correctas y ruido mezclados por data.
  piezasEl.innerHTML = PROMPT_RETO.piezas.map((p) => `
    <button class="piece" data-id="${p.id}">
      <span class="check"><i class="ti ti-check" aria-hidden="true"></i></span>
      <span>${p.texto}</span>
    </button>
  `).join("");

  piezasEl.querySelectorAll(".piece").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (validado) return;
      const id = btn.dataset.id;
      if (elegidas.has(id)) elegidas.delete(id); else elegidas.add(id);
      btn.classList.toggle("on", elegidas.has(id));
      accion.disabled = elegidas.size === 0;
    });
  });

  accion.addEventListener("click", () => {
    if (!validado) {
      validado = true;
      let correctas = 0, errores = 0;
      PROMPT_RETO.piezas.forEach((p) => {
        const btn = piezasEl.querySelector(`.piece[data-id="${p.id}"]`);
        btn.classList.remove("on");
        const elegida = elegidas.has(p.id);
        if (p.correcta && elegida) { btn.classList.add("reveal-good"); correctas++; }
        else if (!p.correcta && elegida) { btn.classList.add("reveal-bad"); errores++; }
        else if (p.correcta && !elegida) { btn.classList.add("reveal-good"); btn.style.opacity = ".55"; }
      });
      state._m5tmp = { elegidas: [...elegidas], correctas, errores, totalCorrectas: PROMPT_RETO.piezas.filter((p) => p.correcta).length };
      accion.innerHTML = `Continuar <i class="ti ti-arrow-right" aria-hidden="true"></i>`;
    } else {
      state.completeMission("m5", state._m5tmp);
    }
  });
}
