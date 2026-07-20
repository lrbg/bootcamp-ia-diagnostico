// Logica de tareas de seguimiento: crear desde el plan, entregar, y revisar
// (evaluar entregas + mandar recordatorios a los que no cumplen).
import { CONFIG } from "./config.js";
import { leerTareas, guardarTareas, actualizarTarea, enviarCorreo, ejecutarRevisionServidor } from "./supabase.js";
import { mockEvaluar } from "./evaluador.js";

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
  let evaluadas = 0, recordatorios = 0;
  const now = Date.now();

  for (const t of arr) {
    // 1) Evaluar entregas pendientes de revision
    if (t.estado === "entregada" && !t.evaluacion) {
      t.evaluacion = mockEvaluar(t);
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

  await guardarTareas(sesion, arr);
  return { ok: true, evaluadas, recordatorios };
}
