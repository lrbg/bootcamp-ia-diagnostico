// Dashboard del facilitador: modelo en vivo (Realtime/BroadcastChannel) + agregados.
import { getSesion } from "./config.js";
import { HERRAMIENTAS, ARQUETIPOS } from "./data.js";
import { conectarSesion, suscribirEventos, leerResultados } from "./supabase.js";
import { diagnosticar } from "./diagnostico.js";
import { generarPlan } from "./plan.js";
import { leerTareas, leerCorreosLocal } from "./supabase.js";
import { crearYEnviarTareas, revisarTareas } from "./tareas.js";

let TAREAS = [];   // todas las tareas de la sesion
let CORREOS = [];  // buzon (solo mock) para mostrar lo enviado

async function recargarSeguimiento() {
  TAREAS = await leerTareas(sesion);
  CORREOS = leerCorreosLocal(sesion);
}

const sesion = getSesion();
document.getElementById("sesion").textContent = sesion;

const nombreTool = (id) => HERRAMIENTAS.find((t) => t.id === id)?.nombre || id;

const DIMS = ["integrador", "esceptico", "constructor", "explorador"];
const DIM_LABEL = { integrador: "Integrador", esceptico: "Esceptico", constructor: "Constructor", explorador: "Explorador" };

// Un registro por participante.
const jugadores = new Map();
function getP(nombre) {
  const key = nombre || "Anonimo";
  if (!jugadores.has(key)) {
    jugadores.set(key, { nombre: key, equipo: "", email: "", progreso: 0, terminado: false, arquetipo: null, dimensiones: null, respuestas: null, cazaM3: null, promptNivel: null, herramientasDiario: [], plan: null, planCargando: false });
  }
  return jugadores.get(key);
}

let seleccionado = null; // nombre del participante en el detalle

function aplicarMisionCompleta(nombre, mision, resultado) {
  const p = getP(nombre);
  p.progreso = Math.max(p.progreso, Number(String(mision).replace("m", "")) || p.progreso);
  if (mision === "m1" && resultado?.asignaciones) {
    p.herramientasDiario = Object.entries(resultado.asignaciones)
      .filter(([, cofre]) => cofre === "diario").map(([id]) => id);
  }
  if (mision === "m3" && resultado?.rondas) {
    const ac = resultado.rondas.reduce((a, x) => a + (x.aciertos || 0), 0);
    const tot = resultado.rondas.reduce((a, x) => a + (x.total || 0), 0);
    p.cazaM3 = tot > 0 && ac === tot;
  }
  if (mision === "m5" && resultado) {
    const totalCorr = resultado.totalCorrectas || 4;
    p.promptNivel = Math.max(0, ((resultado.correctas || 0) - (resultado.errores || 0)) / totalCorr) * 4;
  }
}

function aplicarResultado(registro) {
  const p = getP(registro.nombre);
  p.equipo = registro.equipo || p.equipo;
  p.email = registro.email || p.email;
  p.dimensiones = registro.dimensiones || p.dimensiones;
  p.arquetipo = registro.arquetipo || p.arquetipo;
  p.respuestas = registro.respuestas || p.respuestas;
  p.terminado = true;
  p.progreso = 5;
  const r = registro.respuestas;
  if (r) {
    if (r.m1) aplicarMisionCompleta(registro.nombre, "m1", r.m1);
    if (r.m3) aplicarMisionCompleta(registro.nombre, "m3", r.m3);
    if (r.m5) aplicarMisionCompleta(registro.nombre, "m5", r.m5);
  }
}

// --- Render ---
function barra(lab, valor, max, green = false) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return `<div class="brow ${green ? "green" : ""}"><span class="lab">${lab}</span><span class="track"><span style="width:${pct}%"></span></span><span class="n">${valor}</span></div>`;
}

function render() {
  const arr = [...jugadores.values()];
  const activos = arr.length;
  const terminados = arr.filter((p) => p.terminado);

  document.getElementById("kpi-activos").textContent = activos;
  document.getElementById("kpi-terminaron").textContent = terminados.length;

  const conM3 = arr.filter((p) => p.cazaM3 !== null);
  const cazaron = conM3.filter((p) => p.cazaM3).length;
  document.getElementById("kpi-caza").textContent = conM3.length ? `${Math.round((cazaron / conM3.length) * 100)}%` : "0%";

  const conPrompt = arr.filter((p) => p.promptNivel !== null);
  const avgPrompt = conPrompt.length ? conPrompt.reduce((a, p) => a + p.promptNivel, 0) / conPrompt.length : 0;
  document.getElementById("kpi-prompt").textContent = avgPrompt.toFixed(1);

  // Arquetipos
  const arqCount = {};
  terminados.forEach((p) => { if (p.arquetipo) arqCount[p.arquetipo] = (arqCount[p.arquetipo] || 0) + 1; });
  const arqEl = document.getElementById("p-arquetipos");
  const arqEntries = Object.entries(arqCount).sort((a, b) => b[1] - a[1]);
  const maxArq = Math.max(1, ...arqEntries.map((e) => e[1]));
  arqEl.innerHTML = arqEntries.length
    ? arqEntries.map(([k, n]) => barra(ARQUETIPOS[k]?.nombre || k, n, maxArq)).join("")
    : `<p class="empty">Aun sin resultados.</p>`;

  // Herramientas mas usadas a diario
  const toolCount = {};
  arr.forEach((p) => p.herramientasDiario.forEach((id) => { toolCount[id] = (toolCount[id] || 0) + 1; }));
  const toolEntries = Object.entries(toolCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxTool = Math.max(1, ...toolEntries.map((e) => e[1]));
  document.getElementById("p-herramientas").innerHTML = toolEntries.length
    ? toolEntries.map(([id, n]) => barra(nombreTool(id), n, maxTool, true)).join("")
    : `<p class="empty">Aun sin datos.</p>`;

  // Dimensiones promedio
  const dimEl = document.getElementById("p-dimensiones");
  if (terminados.length) {
    dimEl.innerHTML = DIMS.map((k) => {
      const avg = Math.round(terminados.reduce((a, p) => a + (p.dimensiones?.[k] || 0), 0) / terminados.length);
      return `<div class="brow"><span class="lab">${DIM_LABEL[k]}</span><span class="track"><span style="width:${avg}%"></span></span><span class="n">${avg}</span></div>`;
    }).join("");
  } else {
    dimEl.innerHTML = `<p class="empty">Aun sin resultados.</p>`;
  }

  // Roster
  const rosterEl = document.getElementById("p-roster");
  rosterEl.innerHTML = arr.length ? `
    <table>
      <thead><tr><th>Nombre</th><th>Equipo</th><th>Avance</th><th>Arquetipo</th><th></th></tr></thead>
      <tbody>
        ${arr.map((p) => `
          <tr class="${p.terminado ? "clickable" : ""} ${p.nombre === seleccionado ? "sel" : ""}" data-nombre="${encodeURIComponent(p.nombre)}">
            <td>${p.nombre}</td>
            <td>${p.equipo || "-"}</td>
            <td>${p.terminado ? "Termino" : `${p.progreso}/5`}</td>
            <td>${p.arquetipo ? `<span class="tagchip">${ARQUETIPOS[p.arquetipo]?.nombre || p.arquetipo}</span>` : "-"}</td>
            <td>${p.terminado ? '<span class="ver">ver <i class="ti ti-chevron-right"></i></span>' : ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : `<p class="empty">Esperando a que se unan.</p>`;

  rosterEl.querySelectorAll("tr.clickable").forEach((tr) => {
    tr.addEventListener("click", () => {
      seleccionado = decodeURIComponent(tr.dataset.nombre);
      render();
      document.getElementById("detalle-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  renderDetalle();
}

// --- Detalle de un participante: que le falla + plan ---
const SEV_LABEL = { alta: "Alta", media: "Media", baja: "Baja" };

function renderDetalle() {
  const panel = document.getElementById("detalle-panel");
  const cont = document.getElementById("p-detalle");
  const p = seleccionado ? jugadores.get(seleccionado) : null;

  if (!p || !p.terminado) { panel.hidden = true; return; }
  panel.hidden = false;

  const hallazgos = p.respuestas ? diagnosticar(p.respuestas, p.dimensiones) : [];

  cont.innerHTML = `
    <div class="det-head">
      <div>
        <h3 style="margin:0">${p.nombre}</h3>
        <span class="det-arq">${ARQUETIPOS[p.arquetipo]?.nombre || p.arquetipo || ""} ${p.equipo ? "· " + p.equipo : ""}</span>
      </div>
      <button class="btn sm" id="btn-cerrar-det"><i class="ti ti-x"></i></button>
    </div>

    <h4 class="det-sub">Que le esta fallando</h4>
    <div class="fallas">
      ${hallazgos.length ? hallazgos.map((h) => `
        <div class="falla sev-${h.severidad}">
          <span class="sev">${SEV_LABEL[h.severidad]}</span>
          <div>
            <div class="falla-t">${h.titulo}</div>
            <div class="falla-d">${h.detalle}</div>
          </div>
        </div>
      `).join("") : `<p class="empty">${p.respuestas ? "Sin fallas notables." : "Esperando datos completos del participante."}</p>`}
    </div>

    <div class="det-plan" id="det-plan"></div>

    <button class="btn" id="btn-plan" ${!p.respuestas ? "disabled" : ""}>
      ${p.plan ? "Regenerar plan" : "Generar plan de trabajo con IA"} <i class="ti ti-sparkles"></i>
    </button>

    <div id="seguimiento-sec"></div>
  `;

  cont.querySelector("#btn-cerrar-det").addEventListener("click", () => { seleccionado = null; render(); });

  const planEl = cont.querySelector("#det-plan");
  if (p.plan) planEl.innerHTML = planHTML(p.plan);
  else if (p.planError) planEl.innerHTML = `<p class="plan-error">No se pudo generar: ${p.planError}</p>`;

  const btnPlan = cont.querySelector("#btn-plan");
  if (p.planCargando) { btnPlan.disabled = true; btnPlan.innerHTML = 'Generando plan… <i class="ti ti-loader-2"></i>'; }
  btnPlan.addEventListener("click", async () => {
    p.planCargando = true; p.planError = null; render();
    const res = await generarPlan({ nombre: p.nombre, arquetipo: p.arquetipo, dimensiones: p.dimensiones, respuestas: p.respuestas });
    p.planCargando = false;
    if (res.ok) p.plan = res.plan;
    else p.planError = res.error || "error";
    render();
  });

  pintarSeguimiento(cont, p);
}

// --- Seguimiento: crear/enviar tareas, revisar, ver respuestas + evaluacion ---
function pintarSeguimiento(cont, p) {
  const sec = cont.querySelector("#seguimiento-sec");
  const misTareas = TAREAS.filter((t) => t.participante === p.nombre).sort((a, b) => a.orden - b.orden);

  // El plan solo vive en memoria de esta sesion del admin (se regenera al pedirlo).
  // Si ya hay tareas creadas (persistidas), se muestran aunque no se haya
  // regenerado el plan en esta carga de la pagina.
  if (!p.plan && !misTareas.length) { sec.innerHTML = ""; return; }
  if (!p.plan && misTareas.length) {
    sec.innerHTML = `<p class="mini-note" style="margin-top:14px">Vuelve a generar el plan para ver sus pasos completos arriba. Sus tareas y avance siguen abajo.</p>`;
  }

  const misCorreos = CORREOS.filter((c) => c.nombre === p.nombre);

  if (!p.plan) {
    // Solo tareas (sin plan en memoria): pinta directo la lista y sale.
    pintarListaTareas(sec, p, misTareas, misCorreos, true);
    return;
  }

  if (!misTareas.length) {
    sec.innerHTML = `
      <div class="det-btns" style="margin-top:14px">
        <button class="btn" id="btn-crear-tareas"><i class="ti ti-send"></i> Enviar plan y crear tareas</button>
      </div>
      ${!p.email ? `<p class="mini-note">Sin correo registrado: se crean las tareas pero no se envia email.</p>` : ""}
    `;
    sec.querySelector("#btn-crear-tareas").addEventListener("click", async () => {
      const b = sec.querySelector("#btn-crear-tareas"); b.disabled = true; b.textContent = "Creando…";
      await crearYEnviarTareas(sesion, { nombre: p.nombre, email: p.email, arquetipo: p.arquetipo }, p.plan);
      await recargarSeguimiento();
      render();
    });
    return;
  }

  pintarListaTareas(sec, p, misTareas, misCorreos, false);
}

// Pinta la lista de tareas + boton revisar + buzon de correos.
// append=true agrega debajo de la nota "vuelve a generar el plan" en vez de reemplazar todo.
function pintarListaTareas(sec, p, misTareas, misCorreos, append) {
  const done = misTareas.filter((t) => t.estado === "cumplida").length;
  const html = `
    <h4 class="det-sub" style="margin-top:16px">Tareas y seguimiento (${done}/${misTareas.length} cumplidas)</h4>
    <div class="det-tareas">
      ${misTareas.map((t) => tareaAdminHTML(t)).join("")}
    </div>
    <div class="det-btns">
      <button class="btn ghost" id="btn-revisar"><i class="ti ti-checklist"></i> Revisar tareas ahora</button>
    </div>
    ${misCorreos.length ? `
      <div class="mail-log">
        <h4 class="det-sub">Correos enviados (${misCorreos.length})</h4>
        ${misCorreos.slice(0, 6).map((c) => `
          <div class="mail-item"><i class="ti ti-mail"></i><div><span class="to">${c.to || "sin correo"}</span> — ${c.asunto}</div></div>
        `).join("")}
      </div>` : ""}
  `;
  if (append) sec.insertAdjacentHTML("beforeend", html);
  else sec.innerHTML = html;

  sec.querySelector("#btn-revisar").addEventListener("click", async () => {
    const b = sec.querySelector("#btn-revisar"); b.disabled = true; b.innerHTML = 'Revisando… <i class="ti ti-loader-2"></i>';
    const r = await revisarTareas(sesion);
    await recargarSeguimiento();
    render();
    console.log("Revision:", r);
  });
}

const AT_ESTADO = {
  pendiente: "Pendiente", entregada: "En revision", cumplida: "Cumplida", rehacer: "Por reforzar", vencida: "Vencida",
};

function tareaAdminHTML(t) {
  return `
    <div class="at-row">
      <div class="at-top">
        <span class="task-n">${t.orden}</span>
        <span class="at-title">${t.paso.titulo}</span>
        <span class="tagchip">${AT_ESTADO[t.estado] || t.estado}</span>
      </div>
      ${t.respuesta
        ? `<div class="at-resp"><b>Respuesta:</b> ${t.respuesta}</div>`
        : `<div class="at-noresp">Sin respuesta aun${t.recordatorios ? ` · ${t.recordatorios} recordatorio(s)` : ""}</div>`}
      ${t.evaluacion
        ? `<div class="at-eval ${t.evaluacion.cumple ? "ok" : "redo"}"><b>Evaluacion del agente:</b> ${t.evaluacion.feedback}</div>`
        : (t.respuesta ? `<div class="at-noresp">Pendiente de revision.</div>` : "")}
    </div>
  `;
}

function planHTML(plan) {
  const pasos = (plan.pasos || []).map((s, i) => `
    <div class="paso sev-${s.prioridad || "media"}">
      <div class="paso-top"><span class="paso-n">${i + 1}</span><span class="paso-t">${s.titulo || ""}</span><span class="sev">${SEV_LABEL[s.prioridad] || ""}</span></div>
      ${s.accion ? `<div class="paso-l"><b>Accion:</b> ${s.accion}</div>` : ""}
      ${s.recurso ? `<div class="paso-l"><b>Recurso:</b> ${s.recurso}</div>` : ""}
      ${s.practica ? `<div class="paso-l"><b>Practica:</b> ${s.practica}</div>` : ""}
    </div>
  `).join("");
  return `
    <div class="plan-box">
      <div class="plan-obj"><i class="ti ti-target"></i> ${plan.objetivo || ""}</div>
      ${plan.resumen_fallas ? `<p class="plan-res">${plan.resumen_fallas}</p>` : ""}
      ${pasos}
      ${plan.cierre ? `<div class="plan-cierre"><i class="ti ti-flag-check"></i> ${plan.cierre}</div>` : ""}
    </div>
  `;
}

// --- Manejo de eventos en vivo ---
function onEvento(ev) {
  if (!ev) return;
  if (ev.tipo === "jugador_entra") getP(ev.jugador);
  else if (ev.tipo === "mision_completa") aplicarMisionCompleta(ev.jugador, ev.mision, ev.resultado);
  else if (ev.tipo === "resultado_enviado") {
    const p = getP(ev.jugador);
    p.arquetipo = ev.arquetipo || p.arquetipo;
    p.dimensiones = ev.dimensiones || p.dimensiones;
    p.terminado = true; p.progreso = 5;
  } else if (ev.tipo === "resultado" && ev.registro) {
    aplicarResultado(ev.registro);
  }
  render();
}

async function iniciar() {
  await conectarSesion(sesion);
  suscribirEventos(sesion, onEvento);
  // Semilla con resultados ya guardados (agregados historicos).
  const previos = await leerResultados(sesion);
  previos.forEach(aplicarResultado);
  await recargarSeguimiento();
  render();
}

iniciar();
