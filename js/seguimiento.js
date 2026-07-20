// Pagina de seguimiento del usuario: ve sus tareas y sube su respuesta.
// Se abre con ?sesion=xxx&u=<nombre> (el link que llega por correo).
import { conectarSesion, leerTareas } from "./supabase.js";
import { entregarTarea } from "./tareas.js";
import { progresoDe } from "./nivelacion.js";

const params = new URLSearchParams(location.search);
const sesion = params.get("sesion") || "bootcamp-01";
const usuario = decodeURIComponent(params.get("u") || "");
const screen = document.getElementById("screen");
document.getElementById("quien").textContent = usuario || "seguimiento";

const ESTADO = {
  pendiente: { txt: "Pendiente", cls: "st-pend", icon: "ti-clock" },
  entregada: { txt: "En revision", cls: "st-rev", icon: "ti-hourglass" },
  cumplida: { txt: "Cumplida", cls: "st-ok", icon: "ti-circle-check" },
  rehacer: { txt: "Por reforzar", cls: "st-redo", icon: "ti-refresh" },
  vencida: { txt: "Vencida", cls: "st-late", icon: "ti-alert-triangle" },
};

function fmtFecha(iso) {
  try { return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }); }
  catch { return ""; }
}

async function render() {
  const todas = await leerTareas(sesion);
  const mias = todas.filter((t) => t.participante === usuario).sort((a, b) => a.orden - b.orden);

  if (!usuario) {
    screen.innerHTML = `<div class="card"><h2>Falta tu identificador</h2><p class="lead">Abre el enlace que te llego por correo.</p></div>`;
    return;
  }
  if (!mias.length) {
    screen.innerHTML = `<div class="card"><h2>Hola ${usuario}</h2><p class="lead">Aun no tienes tareas asignadas. Te avisaremos por correo cuando tu plan este listo.</p></div>`;
    return;
  }

  const prog = progresoDe(mias, mias[0]?.arquetipo);

  screen.innerHTML = `
    <div class="card">
      <p class="kicker">Tu plan de trabajo</p>
      <h1 style="font-size:22px">Hola, ${usuario}</h1>
      <div class="rango-row">
        <span class="rango-badge"><i class="ti ti-award" aria-hidden="true"></i> ${prog.titulo}</span>
        ${prog.racha > 0 ? `<span class="racha-badge"><i class="ti ti-flame" aria-hidden="true"></i> racha ${prog.racha}</span>` : ""}
      </div>
      <div class="xp">
        <span>${prog.xp} XP</span>
        <span class="xp-bar"><span style="width:${prog.rango.pct}%"></span></span>
        <span>${prog.rango.siguiente ? `faltan ${prog.rango.faltanXP}` : "tope"}</span>
      </div>
      <p class="lead" style="margin:10px 0 0">Cada tarea que cumples te da XP y desbloquea el siguiente reto. No rompas la racha.</p>
    </div>
    <div id="lista"></div>
  `;

  const lista = screen.querySelector("#lista");
  lista.innerHTML = mias.map((t) => tareaHTML(t)).join("");

  mias.forEach((t) => {
    const btn = lista.querySelector(`[data-enviar="${t.id}"]`);
    if (btn) btn.addEventListener("click", async () => {
      const ta = lista.querySelector(`[data-resp="${t.id}"]`);
      const val = (ta.value || "").trim();
      if (val.length < 5) { ta.focus(); return; }
      btn.disabled = true; btn.textContent = "Enviando…";
      await entregarTarea(sesion, t.id, val);
      render();
    });
  });
}

function tareaHTML(t) {
  const st = ESTADO[t.estado] || ESTADO.pendiente;
  const editable = t.estado === "pendiente" || t.estado === "rehacer" || t.estado === "vencida";
  const p = t.paso;
  return `
    <div class="task-card">
      <div class="task-head">
        <span class="task-n">${t.orden}</span>
        <div class="task-title">${p.titulo}</div>
        <span class="task-st ${st.cls}"><i class="ti ${st.icon}"></i> ${st.txt}</span>
      </div>
      <div class="task-body">
        ${p.accion ? `<div class="task-l"><b>Que hacer:</b> ${p.accion}</div>` : ""}
        ${p.recurso ? `<div class="task-l"><b>Recurso:</b> ${p.recurso}</div>` : ""}
        ${p.practica ? `<div class="task-l"><b>Practica:</b> ${p.practica}</div>` : ""}
        <div class="task-meta">Limite: ${fmtFecha(t.fecha_limite)}${t.recordatorios ? ` · ${t.recordatorios} recordatorio(s)` : ""}</div>

        ${t.evaluacion ? `
          <div class="task-eval ${t.evaluacion.cumple ? "ok" : "redo"}">
            <b>${t.evaluacion.cumple ? "Cumplida" : "A reforzar"}:</b> ${t.evaluacion.feedback}
          </div>` : ""}

        ${t.respuesta && !editable ? `<div class="task-resp"><b>Tu respuesta:</b> ${t.respuesta}</div>` : ""}

        ${editable ? `
          <textarea class="task-input" data-resp="${t.id}" placeholder="Cuenta que hiciste: un ejemplo real y su resultado" rows="3">${t.respuesta || ""}</textarea>
          <button class="btn sm" data-enviar="${t.id}">${t.estado === "rehacer" ? "Reintentar" : "Entregar"} <i class="ti ti-send"></i></button>
        ` : ""}
      </div>
    </div>
  `;
}

async function iniciar() {
  await conectarSesion(sesion);
  render();
}
iniciar();
