// Logica de tareas de seguimiento: crear desde el plan, entregar, y revisar
// (evaluar entregas + mandar recordatorios a los que no cumplen).
import { CONFIG } from "./config.js";
import { RETOS_POR_AREA, RETOS_TECNICOS } from "./data.js";
import { leerTareas, guardarTareas, actualizarTarea, enviarCorreo, ejecutarRevisionServidor } from "./supabase.js";
import { mockEvaluar, mockEvaluarTecnico } from "./evaluador.js";
import { progresoDe } from "./nivelacion.js";

const DIA = 86400000;
const ahora = () => new Date();
const enDias = (n) => new Date(Date.now() + n * DIA).toISOString();
const nuevoId = () => (crypto?.randomUUID ? crypto.randomUUID() : "t-" + Date.now() + "-" + Math.floor(Math.random() * 1e6));

// Base para el link de seguimiento en los correos.
function baseUrl() {
  return CONFIG.BASE_URL || (typeof location !== "undefined" ? location.origin : "");
}
function linkSeguimiento(sesion, participante) {
  const token = encodeURIComponent(participante);
  return `${baseUrl()}/seguimiento.html?sesion=${encodeURIComponent(sesion)}&u=${token}`;
}

// Crea una tarea por cada paso del plan y las guarda. Manda el correo del plan.
export async function crearYEnviarTareas(sesion, registro, plan) {
  const existentes = await leerTareas(sesion);
  const yaTiene = existentes.some((t) => t.participante === registro.nombre);
  if (yaTiene) return { ok: false, motivo: "Ya tiene tareas creadas." };

  const tareas = (plan.pasos || []).map((paso, i) => ({
    id: nuevoId(),
    sesion,
    participante: registro.nombre,
    email: registro.email || "",
    arquetipo: registro.arquetipo || "",
    orden: i + 1,
    paso,
    area: paso.area || "Dimension",   // Fase 2: para desbloquear el siguiente reto
    nivel: 1,                          // Fase 2: escalon dentro del area
    estado: "pendiente",           // pendiente | entregada | cumplida | rehacer | vencida
    creada_at: ahora().toISOString(),
    fecha_limite: enDias(CONFIG.TAREAS.LIMITE_DIAS),
    respuesta: null,
    entregada_at: null,
    evaluacion: null,
    recordatorios: 0,
    ultimo_recordatorio_at: null,
  }));

  await guardarTareas(sesion, existentes.concat(tareas));

  const correo = await enviarCorreo(sesion, {
    tipo: "plan",
    to: registro.email,
    nombre: registro.nombre,
    asunto: "Tu plan de trabajo del Bootcamp IA",
    objetivo: plan.objetivo,
    pasos: plan.pasos,
    link: linkSeguimiento(sesion, registro.nombre),
    limite_dias: CONFIG.TAREAS.LIMITE_DIAS,
  });

  return { ok: true, tareas, correoOk: correo.ok, sinCorreo: !registro.email };
}

// El admin asigna un reto tecnico (crear agente/skill/etc.) a un participante.
export async function asignarRetoTecnico(sesion, registro, retoId) {
  const reto = RETOS_TECNICOS.find((r) => r.id === retoId);
  if (!reto) return { ok: false, motivo: "Reto no encontrado." };

  const arr = await leerTareas(sesion);
  if (arr.some((t) => t.participante === registro.nombre && t.tipo === "tecnico" && t.retoId === retoId)) {
    return { ok: false, motivo: "Ya tiene ese reto asignado." };
  }
  const maxOrden = arr.filter((t) => t.participante === registro.nombre).reduce((m, t) => Math.max(m, t.orden || 0), 0);

  const tarea = {
    id: nuevoId(), sesion, participante: registro.nombre, email: registro.email || "",
    arquetipo: registro.arquetipo || "", orden: maxOrden + 1,
    tipo: "tecnico", retoId: reto.id,
    paso: { titulo: reto.titulo, accion: reto.enunciado, area: reto.area },
    criterios: reto.criterios, area: reto.area, nivel: 1,
    estado: "pendiente", creada_at: ahora().toISOString(),
    fecha_limite: enDias(CONFIG.TAREAS.LIMITE_DIAS),
    respuesta: null, entregada_at: null, evaluacion: null,
    recordatorios: 0, ultimo_recordatorio_at: null,
  };
  arr.push(tarea);
  await guardarTareas(sesion, arr);

  const correo = await enviarCorreo(sesion, {
    tipo: "reto", to: registro.email, nombre: registro.nombre,
    asunto: `Nuevo reto tecnico: ${reto.titulo}`,
    tarea: reto.titulo, accion: reto.enunciado,
    link: linkSeguimiento(sesion, registro.nombre),
  });
  return { ok: true, tarea, correoOk: correo.ok, sinCorreo: !registro.email };
}

// El usuario entrega una tarea con su respuesta.
export async function entregarTarea(sesion, tareaId, respuesta) {
  const arr = await leerTareas(sesion);
  const t = arr.find((x) => x.id === tareaId);
  if (!t) return { ok: false };
  t.respuesta = respuesta;
  t.entregada_at = ahora().toISOString();
  t.estado = "entregada";
  await actualizarTarea(sesion, t);
  return { ok: true, tarea: t };
}

// Revision (boton manual en mock). En real, el servidor lo hace via Edge Function.
// - Evalua entregas sin evaluar.
// - Manda recordatorio a los vencidos que no entregaron (segun cadencia).
export async function revisarTareas(sesion) {
  if (!CONFIG.MOCK_MODE) return ejecutarRevisionServidor(sesion);

  const arr = await leerTareas(sesion);
  let evaluadas = 0, recordatorios = 0, retosNuevos = 0;
  const now = Date.now();

  // Snapshot de rango por participante (para detectar subida de nivel).
  const rangoAntes = snapshotRangos(arr);

  for (const t of arr) {
    // 1) Evaluar entregas pendientes de revision
    if (t.estado === "entregada" && !t.evaluacion) {
      t.evaluacion = t.tipo === "tecnico" ? mockEvaluarTecnico(t) : mockEvaluar(t);
      t.estado = t.evaluacion.cumple ? "cumplida" : "rehacer";
      evaluadas++;
      if (t.email) {
        await enviarCorreo(sesion, {
          tipo: "evaluacion",
          to: t.email, nombre: t.participante,
          asunto: t.evaluacion.cumple ? "Revisamos tu tarea: cumplida" : "Revisamos tu tarea: por reforzar",
          tarea: t.paso.titulo, veredicto: t.evaluacion.veredicto, feedback: t.evaluacion.feedback,
          link: linkSeguimiento(sesion, t.participante),
        });
      }
      // Fase 2: al cumplir un reto del plan, desbloquea el siguiente del area.
      // Los retos tecnicos los asigna el admin, no se auto-encadenan.
      if (t.evaluacion.cumple && t.tipo !== "tecnico") {
        const nuevo = crearSiguienteReto(arr, t);
        if (nuevo) {
          retosNuevos++;
          if (t.email) {
            await enviarCorreo(sesion, {
              tipo: "reto", to: t.email, nombre: t.participante,
              asunto: "Nuevo reto desbloqueado en tu plan",
              tarea: nuevo.paso.titulo, accion: nuevo.paso.accion,
              link: linkSeguimiento(sesion, t.participante),
            });
          }
        }
      }
      continue;
    }

    // 2) Recordatorios a los que no han entregado y ya vencieron
    const sinEntregar = t.estado === "pendiente" || t.estado === "rehacer" || t.estado === "vencida";
    const vencida = now > new Date(t.fecha_limite).getTime();
    if (sinEntregar && vencida) {
      if (t.estado !== "vencida" && t.estado !== "rehacer") t.estado = "vencida";
      const listoParaRecordar =
        t.recordatorios < CONFIG.TAREAS.MAX_RECORDATORIOS &&
        (!t.ultimo_recordatorio_at || now - new Date(t.ultimo_recordatorio_at).getTime() >= CONFIG.TAREAS.RECORDATORIO_DIAS * DIA);
      if (listoParaRecordar && t.email) {
        t.recordatorios++;
        t.ultimo_recordatorio_at = ahora().toISOString();
        recordatorios++;
        await enviarCorreo(sesion, {
          tipo: "recordatorio",
          to: t.email, nombre: t.participante,
          asunto: `Recordatorio ${t.recordatorios}/${CONFIG.TAREAS.MAX_RECORDATORIOS}: tienes una tarea pendiente`,
          tarea: t.paso.titulo, accion: t.paso.accion, intento: t.recordatorios,
          link: linkSeguimiento(sesion, t.participante),
        });
      }
    }
  }

  // Fase 2: detectar subidas de rango y avisar por correo.
  let subidas = 0;
  const rangoDespues = snapshotRangos(arr);
  for (const [nombre, info] of Object.entries(rangoDespues)) {
    const antes = rangoAntes[nombre];
    if (antes && info.nivel > antes.nivel && info.email) {
      subidas++;
      await enviarCorreo(sesion, {
        tipo: "nivel", to: info.email, nombre,
        asunto: `Subiste a ${info.rango}`,
        rango: info.rango,
        link: linkSeguimiento(sesion, nombre),
      });
    }
  }

  await guardarTareas(sesion, arr);
  return { ok: true, evaluadas, recordatorios, retosNuevos, subidas };
}

// Crea el siguiente reto (mas dificil) del area, si existe y no esta ya creado.
function crearSiguienteReto(arr, tareaCumplida) {
  const area = tareaCumplida.area || "Dimension";
  const nivelActual = tareaCumplida.nivel || 1;
  const ladder = RETOS_POR_AREA[area] || RETOS_POR_AREA["Dimension"];
  const contenido = ladder[nivelActual - 1]; // nivel1 -> index0 (nivel2)
  if (!contenido) return null;               // ya llego al tope del area
  const nuevoNivel = nivelActual + 1;

  const yaExiste = arr.some((t) =>
    t.participante === tareaCumplida.participante && t.area === area && t.nivel === nuevoNivel);
  if (yaExiste) return null;

  const maxOrden = arr.filter((t) => t.participante === tareaCumplida.participante)
    .reduce((m, t) => Math.max(m, t.orden || 0), 0);

  const nuevo = {
    id: nuevoId(), sesion: tareaCumplida.sesion,
    participante: tareaCumplida.participante, email: tareaCumplida.email,
    arquetipo: tareaCumplida.arquetipo,
    orden: maxOrden + 1, paso: { ...contenido, area, prioridad: "media" },
    area, nivel: nuevoNivel,
    estado: "pendiente", creada_at: ahora().toISOString(),
    fecha_limite: enDias(CONFIG.TAREAS.LIMITE_DIAS),
    respuesta: null, entregada_at: null, evaluacion: null,
    recordatorios: 0, ultimo_recordatorio_at: null,
  };
  arr.push(nuevo);
  return nuevo;
}

// Rango actual por participante (para comparar antes/despues).
function snapshotRangos(arr) {
  const porNombre = {};
  for (const t of arr) {
    (porNombre[t.participante] = porNombre[t.participante] || { tareas: [], email: t.email, arquetipo: t.arquetipo }).tareas.push(t);
    if (t.email) porNombre[t.participante].email = t.email;
  }
  const out = {};
  for (const [nombre, info] of Object.entries(porNombre)) {
    const p = progresoDe(info.tareas, info.arquetipo);
    out[nombre] = { nivel: p.rango.nivel, rango: p.rango.nombre, email: info.email };
  }
  return out;
}
