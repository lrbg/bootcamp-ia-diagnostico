// Mision 1 - Arsenal de IA.
// Clasifica cada herramienta en un cofre. Funciona con arrastrar y con toque
// (tocar la ficha -> tocar el cofre), pensado para que sea comodo en celular.

import { HERRAMIENTAS, COFRES } from "../data.js";
import { misionHeader } from "../ui.js";

export function renderArsenal(screen, state) {
  const asignaciones = {}; // idHerramienta -> idCofre
  let seleccionada = null;
  const extras = [];       // herramientas que agrega el jugador

  screen.innerHTML = `
    ${misionHeader("m1", "Arma tu arsenal", "Coloca cada herramienta en el cofre que le toca. Arrastra o toca la ficha y luego el cofre.")}
    <div class="xp">
      <span>Poder de arsenal</span>
      <span class="xp-bar"><span id="xp-fill"></span></span>
      <span id="xp-count">0/${HERRAMIENTAS.length}</span>
    </div>
    <div class="pool" id="pool"></div>
    <div class="add-tool">
      <input id="extra-input" type="text" placeholder="Agrega otra herramienta" maxlength="24" />
      <button class="btn ghost sm" id="extra-add"><i class="ti ti-plus" aria-hidden="true"></i></button>
    </div>
    <div class="chests" id="chests"></div>
    <div class="actions">
      <button class="btn" id="continuar" disabled>Continuar <i class="ti ti-arrow-right" aria-hidden="true"></i></button>
    </div>
  `;

  const pool = screen.querySelector("#pool");
  const chestsEl = screen.querySelector("#chests");
  const continuar = screen.querySelector("#continuar");
  const xpFill = screen.querySelector("#xp-fill");
  const xpCount = screen.querySelector("#xp-count");

  // Dibuja los cofres
  chestsEl.innerHTML = COFRES.map((c) => `
    <div class="chest" data-cofre="${c.id}">
      <h4>${c.titulo}</h4>
      <div class="drop-tools" data-drop="${c.id}"></div>
    </div>
  `).join("");

  function todasLasHerramientas() {
    return [...HERRAMIENTAS, ...extras];
  }

  function chipHTML(t) {
    return `<span class="tool" draggable="true" data-tool="${t.id}"><i class="ti ${t.icono}" aria-hidden="true"></i>${t.nombre}</span>`;
  }

  function pintar() {
    // Pool: herramientas aun sin asignar
    pool.innerHTML = todasLasHerramientas()
      .filter((t) => !asignaciones[t.id])
      .map(chipHTML).join("") || `<span class="hint" style="margin:0">Todo clasificado.</span>`;

    // Cofres
    COFRES.forEach((c) => {
      const cont = chestsEl.querySelector(`[data-drop="${c.id}"]`);
      cont.innerHTML = todasLasHerramientas()
        .filter((t) => asignaciones[t.id] === c.id)
        .map(chipHTML).join("");
    });

    conectarFichas();

    const colocadas = Object.keys(asignaciones).length;
    const total = todasLasHerramientas().length;
    xpCount.textContent = `${colocadas}/${total}`;
    xpFill.style.width = `${Math.round((colocadas / total) * 100)}%`;
    // Se puede continuar cuando estan colocadas todas las base.
    continuar.disabled = HERRAMIENTAS.some((t) => !asignaciones[t.id]);
  }

  function conectarFichas() {
    screen.querySelectorAll(".tool").forEach((chip) => {
      chip.classList.toggle("selected", chip.dataset.tool === seleccionada);
      chip.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", chip.dataset.tool);
        chip.classList.add("dragging");
      });
      chip.addEventListener("dragend", () => chip.classList.remove("dragging"));
      // Toque: seleccionar / deseleccionar
      chip.addEventListener("click", () => {
        seleccionada = seleccionada === chip.dataset.tool ? null : chip.dataset.tool;
        pintar();
      });
    });
  }

  function colocar(idTool, idCofre) {
    asignaciones[idTool] = idCofre;
    seleccionada = null;
    pintar();
  }

  // Drag & drop + toque sobre cofres
  chestsEl.querySelectorAll(".chest").forEach((chest) => {
    const idCofre = chest.dataset.cofre;
    chest.addEventListener("dragover", (e) => { e.preventDefault(); chest.classList.add("hot"); });
    chest.addEventListener("dragleave", () => chest.classList.remove("hot"));
    chest.addEventListener("drop", (e) => {
      e.preventDefault();
      chest.classList.remove("hot");
      const id = e.dataTransfer.getData("text/plain");
      if (id) colocar(id, idCofre);
    });
    chest.addEventListener("click", () => {
      if (seleccionada) colocar(seleccionada, idCofre);
    });
  });

  // Agregar herramienta propia
  const extraInput = screen.querySelector("#extra-input");
  screen.querySelector("#extra-add").addEventListener("click", () => {
    const nombre = extraInput.value.trim();
    if (!nombre) return;
    const id = "extra-" + extras.length;
    extras.push({ id, nombre, icono: "ti-star" });
    extraInput.value = "";
    pintar();
  });

  continuar.addEventListener("click", () => {
    state.completeMission("m1", { asignaciones, extras: extras.map((e) => e.nombre) });
  });

  pintar();
}
