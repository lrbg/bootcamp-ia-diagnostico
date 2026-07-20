// Pantalla de inicio: nombre y equipo, luego arranca la primera mision.
import { CONFIG } from "../config.js";

export function renderInicio(screen, state, onStart) {
  screen.innerHTML = `
    <div class="card">
      <p class="kicker">${CONFIG.EVENTO} · nivelacion</p>
      <h1>Descubre tu arquetipo de IA</h1>
      <p class="lead">5 misiones cortas. No hay respuestas correctas: queremos saber como piensas y trabajas con IA.</p>
      <div class="field">
        <i class="ti ti-user" aria-hidden="true"></i>
        <input id="in-nombre" type="text" placeholder="Como te llamas" autocomplete="off" maxlength="40" />
      </div>
      <div class="field">
        <i class="ti ti-flag" aria-hidden="true"></i>
        <input id="in-equipo" type="text" placeholder="Tu equipo (opcional)" autocomplete="off" maxlength="40" />
      </div>
      <div class="field">
        <i class="ti ti-mail" aria-hidden="true"></i>
        <input id="in-email" type="email" placeholder="Tu correo (para tu plan y seguimiento)" autocomplete="off" maxlength="80" />
      </div>
    </div>
    <div class="actions">
      <button class="btn" id="in-start" disabled>Comenzar mision <i class="ti ti-arrow-right" aria-hidden="true"></i></button>
      <p class="hint">Tarda unos 5 minutos. Se juega mejor desde el celular.</p>
    </div>
  `;

  const nombre = screen.querySelector("#in-nombre");
  const equipo = screen.querySelector("#in-equipo");
  const email = screen.querySelector("#in-email");
  const start = screen.querySelector("#in-start");

  const validar = () => { start.disabled = nombre.value.trim().length < 2; };
  nombre.addEventListener("input", validar);

  start.addEventListener("click", () => {
    state.jugador.nombre = nombre.value.trim();
    state.jugador.equipo = equipo.value.trim();
    state.jugador.email = email.value.trim();
    onStart();
  });

  nombre.focus();
}
