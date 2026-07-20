// Mision 3 - Caza de alucinaciones.
// Marca las afirmaciones inventadas. El reloj es generoso: si se acaba, solo
// revela la respuesta (no castiga a quien piensa despacio).
import { RONDAS_ALUCINACION } from "../data.js";
import { misionHeader } from "../ui.js";

const SEGUNDOS_RONDA = 40;

export function renderAlucinaciones(screen, state) {
  const resultados = []; // por ronda: { marcadas:[i], aciertos, total }
  let ronda = 0;

  function pintarRonda() {
    const data = RONDAS_ALUCINACION[ronda];
    const marcadas = new Set();
    let revelado = false;
    let restante = SEGUNDOS_RONDA;
    let intervalo = null;

    screen.innerHTML = `
      ${misionHeader("m3", "Caza de alucinaciones", `Ronda ${ronda + 1} de ${RONDAS_ALUCINACION.length}. ${data.contexto}`)}
      <div class="timer">
        <i class="ti ti-clock" aria-hidden="true"></i>
        <span class="timer-bar" id="tbar"><span></span></span>
        <span class="t" id="tnum">0:${String(SEGUNDOS_RONDA).padStart(2, "0")}</span>
      </div>
      <div id="claims"></div>
      <div class="actions">
        <button class="btn" id="accion" disabled>Revelar respuesta <i class="ti ti-eye" aria-hidden="true"></i></button>
      </div>
    `;

    const claimsEl = screen.querySelector("#claims");
    const accion = screen.querySelector("#accion");
    const tbar = screen.querySelector("#tbar");
    const tbarFill = tbar.querySelector("span");
    const tnum = screen.querySelector("#tnum");

    claimsEl.innerHTML = data.afirmaciones.map((a, i) => `
      <div class="claim" data-i="${i}">
        <i class="ti ti-circle" aria-hidden="true"></i>
        <div>
          <div class="claim-text">${a.texto}</div>
          <div class="why" hidden></div>
        </div>
      </div>
    `).join("");

    function refrescarBoton() {
      accion.disabled = false; // siempre se puede revelar (marcar es opcional)
    }

    claimsEl.querySelectorAll(".claim").forEach((el) => {
      el.addEventListener("click", () => {
        if (revelado) return;
        const i = Number(el.dataset.i);
        if (marcadas.has(i)) { marcadas.delete(i); el.classList.remove("marked"); el.querySelector("i").className = "ti ti-circle"; }
        else { marcadas.add(i); el.classList.add("marked"); el.querySelector("i").className = "ti ti-alert-triangle"; }
        refrescarBoton();
      });
    });

    function revelar() {
      if (revelado) return;
      revelado = true;
      clearInterval(intervalo);
      let aciertos = 0;
      data.afirmaciones.forEach((a, i) => {
        const el = claimsEl.querySelector(`.claim[data-i="${i}"]`);
        const marcada = marcadas.has(i);
        if (marcada === a.falsa) aciertos++;
        el.classList.remove("marked");
        if (a.falsa) {
          el.classList.add("reveal-false");
          el.querySelector("i").className = "ti ti-alert-triangle";
          el.insertAdjacentHTML("beforeend", `<span class="badge-false">Inventada</span>`);
          const why = el.querySelector(".why");
          why.hidden = false; why.textContent = a.porque || "";
        } else {
          el.classList.add("reveal-true");
          el.querySelector("i").className = "ti ti-circle-check";
        }
      });
      resultados.push({ marcadas: [...marcadas], aciertos, total: data.afirmaciones.length });

      const ultima = ronda === RONDAS_ALUCINACION.length - 1;
      accion.innerHTML = ultima
        ? `Continuar <i class="ti ti-arrow-right" aria-hidden="true"></i>`
        : `Siguiente ronda <i class="ti ti-arrow-right" aria-hidden="true"></i>`;
      accion.onclick = () => {
        if (ultima) state.completeMission("m3", { rondas: resultados });
        else { ronda++; pintarRonda(); window.scrollTo(0, 0); }
      };
    }

    accion.addEventListener("click", revelar);

    // Reloj generoso
    intervalo = setInterval(() => {
      restante--;
      const pct = Math.max(0, (restante / SEGUNDOS_RONDA) * 100);
      tbarFill.style.width = `${pct}%`;
      tnum.textContent = `0:${String(Math.max(0, restante)).padStart(2, "0")}`;
      tbar.classList.toggle("low", restante <= 10);
      if (restante <= 0) revelar();
    }, 1000);

    refrescarBoton();
  }

  pintarRonda();
}
