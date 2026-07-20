// Carta de personaje: arquetipo + radar + envio de resultados.
import { calcularDimensiones, calcularArquetipo } from "../scoring.js";
import { radarSVG } from "../radar.js";
import { guardarResultado, publicarEvento } from "../supabase.js";

const DIM_LABEL = {
  integrador: "Integrador",
  esceptico: "Esceptico",
  explorador: "Explorador",
  constructor: "Constructor",
};

const nivel = (v) => Math.min(4, Math.floor(v / 25) + 1);

export function renderCarta(screen, state) {
  const dimensiones = calcularDimensiones(state.respuestas);
  const arquetipo = calcularArquetipo(dimensiones);

  const dimsOrden = Object.keys(DIM_LABEL).sort((a, b) => dimensiones[b] - dimensiones[a]);

  screen.innerHTML = `
    <div class="card carta">
      <p class="kicker" style="text-align:center">Tu arquetipo</p>
      <div class="arquetipo">${arquetipo.nombre}</div>
      <p class="arq-desc">${arquetipo.desc}</p>
      <div class="radar-wrap">${radarSVG(dimensiones)}</div>
      <div class="dims">
        ${dimsOrden.map((k) => `
          <div class="dim">
            <div class="k">${DIM_LABEL[k]}</div>
            <div class="v">Nivel ${nivel(dimensiones[k])}</div>
            <div class="bar"><span style="width:${dimensiones[k]}%"></span></div>
          </div>
        `).join("")}
      </div>
      <div class="reco">
        <i class="ti ti-bulb" aria-hidden="true"></i>
        <span>${arquetipo.recomendacion}</span>
      </div>
      <div class="carta-actions">
        <button class="btn ghost" id="compartir"><i class="ti ti-copy" aria-hidden="true"></i> Copiar</button>
        <button class="btn" id="enviar">Enviar resultados <i class="ti ti-send" aria-hidden="true"></i></button>
      </div>
    </div>
  `;

  const registro = {
    nombre: state.jugador.nombre,
    equipo: state.jugador.equipo,
    email: state.jugador.email || "",
    respuestas: state.respuestas,
    dimensiones,
    arquetipo: arquetipo.clave,
  };

  screen.querySelector("#compartir").addEventListener("click", async () => {
    const resumen = `Mi arquetipo de IA: ${arquetipo.nombre}. ` +
      dimsOrden.map((k) => `${DIM_LABEL[k]} nivel ${nivel(dimensiones[k])}`).join(", ") + ".";
    try {
      await navigator.clipboard.writeText(resumen);
      const b = screen.querySelector("#compartir");
      b.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i> Copiado`;
    } catch {
      alert(resumen);
    }
  });

  screen.querySelector("#enviar").addEventListener("click", async () => {
    const btn = screen.querySelector("#enviar");
    btn.disabled = true;
    btn.innerHTML = `Enviando <i class="ti ti-loader-2" aria-hidden="true"></i>`;
    const res = await guardarResultado(state.sesion, registro);
    publicarEvento(state.sesion, {
      tipo: "resultado_enviado",
      jugador: state.jugador.nombre,
      arquetipo: arquetipo.clave,
      dimensiones,
    });
    if (res.ok) mostrarEnviado(screen, arquetipo);
    else { btn.disabled = false; btn.innerHTML = `Reintentar <i class="ti ti-refresh" aria-hidden="true"></i>`; }
  });
}

function mostrarEnviado(screen, arquetipo) {
  screen.innerHTML = `
    <div class="card sent">
      <div class="big-check"><i class="ti ti-check" aria-hidden="true"></i></div>
      <h2>Listo, quedo registrado</h2>
      <p class="lead" style="margin-bottom:0">Eres <strong>${arquetipo.nombre}</strong>. Tu resultado ya aparece en el tablero del facilitador.</p>
    </div>
  `;
}
