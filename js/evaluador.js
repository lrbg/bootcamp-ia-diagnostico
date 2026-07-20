// Evaluador (agente revisor) para el modo mock. En real, la evaluacion la hace
// la Edge Function bootcamp-followup con OpenAI; esto es su equivalente local
// para poder probar todo el flujo sin backend.

// Evalua un reto tecnico: corre los chequeos estructurales sobre el codigo pegado.
// (En real, la Edge Function ademas hace revision semantica con OpenAI y la rubrica.)
export function mockEvaluarTecnico(tarea) {
  const codigo = (tarea.respuesta || "").toLowerCase();
  const criterios = tarea.criterios || [];
  const resultados = criterios.map((c) => {
    const any = (c.any || []).some((k) => codigo.includes(k.toLowerCase()));
    const all = (c.all || []).length ? c.all.every((k) => codigo.includes(k.toLowerCase())) : true;
    return { nombre: c.nombre, ok: any && all && codigo.length >= 20 };
  });
  const pasados = resultados.filter((r) => r.ok).length;
  const total = resultados.length || 1;
  const cumple = codigo.length >= 30 && pasados >= Math.ceil(total * 0.75);

  const faltan = resultados.filter((r) => !r.ok).map((r) => r.nombre);
  const feedback = cumple
    ? `Buen trabajo: tu solucion cubre ${pasados}/${total} criterios. Va bien encaminada.`
    : (codigo.length < 30
        ? "Aun no pegaste tu solucion (o es muy corta). Pega tu codigo o flujo para evaluarlo."
        : `Cubres ${pasados}/${total} criterios. Te falta: ${faltan.join("; ")}. Completalo y reenvia.`);

  return {
    cumple, veredicto: cumple ? "cumplida" : "rehacer",
    feedback, criterios: resultados, modelo: "estructural", at: new Date().toISOString(),
  };
}

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
