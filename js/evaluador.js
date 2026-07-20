// Evaluador (agente revisor) para el modo mock. En real, la evaluacion la hace
// la Edge Function bootcamp-followup con OpenAI; esto es su equivalente local
// para poder probar todo el flujo sin backend.

export function mockEvaluar(tarea) {
  const r = (tarea.respuesta || "").trim();
  const palabras = r.split(/\s+/).filter(Boolean).length;
  // Heuristica simple: una respuesta util es concreta y con algo de detalle.
  const generica = /^(ya|listo|hecho|ok|si|no|lo hice)\.?$/i.test(r);
  const cumple = palabras >= 12 && !generica;

  return {
    cumple,
    veredicto: cumple ? "cumplida" : "rehacer",
    feedback: cumple
      ? `Buen avance en "${tarea.paso.titulo}". Se nota que aplicaste la practica; describe bien lo que hiciste. Sigue con el siguiente paso.`
      : `Tu respuesta a "${tarea.paso.titulo}" quedo muy breve o generica. Cuenta con detalle que hiciste en concreto (un ejemplo real y su resultado) y reintenta.`,
    modelo: "mock",
    at: new Date().toISOString(),
  };
}
