// Edge Function: envia correos del Bootcamp IA con Resend (reusa la conexion de
// Polibio; RESEND_API_KEY vive como secreto de Supabase).
// Remitente con marca Bootcamp IA. Tipos: plan | recordatorio | evaluacion.
//
// Deploy: supabase functions deploy bootcamp-email --project-ref hyylhendjtwdtflzsjdx --no-verify-jwt

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM = "Bootcamp IA <noreply@metaiqcli.pro>";

const shell = (titulo: string, cuerpo: string) => `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#123a5e">
  <div style="background:#0090da;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-weight:600;font-size:18px">Bootcamp de IA</div>
  <div style="border:1px solid #dce5ef;border-top:none;border-radius:0 0 12px 12px;padding:20px">
    <h2 style="margin:0 0 12px;color:#123a5e;font-size:19px">${titulo}</h2>
    ${cuerpo}
  </div>
  <p style="color:#93a1b2;font-size:12px;text-align:center;margin-top:14px">Bootcamp de IA · este correo es parte de tu plan de crecimiento</p>
</div>`;

const boton = (link: string, txt: string) =>
  link ? `<a href="${link}" style="display:inline-block;background:#0090da;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;margin-top:14px">${txt}</a>` : "";

function construir(p: Record<string, unknown>): { asunto: string; html: string } {
  const nombre = (p.nombre as string) || "";
  const link = (p.link as string) || "";
  if (p.tipo === "plan") {
    const pasos = ((p.pasos as any[]) || []).map((s, i) =>
      `<div style="border-left:4px solid #0090da;background:#f6f9fc;padding:10px 12px;margin:8px 0">
        <b>${i + 1}. ${s.titulo || ""}</b><br>${s.accion || ""}</div>`).join("");
    return {
      asunto: (p.asunto as string) || "Tu plan de trabajo del Bootcamp IA",
      html: shell(`Hola ${nombre}, este es tu plan`,
        `<p>${(p.objetivo as string) || "Estas actividades te ayudaran a crecer en IA."}</p>${pasos}
         <p>Tienes ${p.limite_dias || 3} dias para cada tarea. Entrega tu avance aqui:</p>
         ${boton(link, "Ir a mis tareas")}`),
    };
  }
  if (p.tipo === "recordatorio") {
    return {
      asunto: (p.asunto as string) || "Recordatorio: tienes una tarea pendiente",
      html: shell(`${nombre}, no olvides tu tarea`,
        `<p>Tienes pendiente: <b>${p.tarea || ""}</b>.</p><p>${p.accion || ""}</p>
         <p>Es tu recordatorio numero ${p.intento || 1}. Completala para seguir avanzando.</p>
         ${boton(link, "Entregar ahora")}`),
    };
  }
  // evaluacion
  const ok = p.veredicto === "cumplida";
  return {
    asunto: (p.asunto as string) || "Revisamos tu tarea",
    html: shell(ok ? `Bien hecho, ${nombre}` : `${nombre}, hay que reforzar`,
      `<p>Sobre tu tarea <b>${p.tarea || ""}</b>:</p>
       <div style="background:${ok ? "#eef7e6" : "#e6f4fb"};padding:12px;border-radius:10px">${p.feedback || ""}</div>
       ${boton(link, ok ? "Ver mi avance" : "Reintentar")}`),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const respond = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });

  try {
    const appKey = Deno.env.get("BOOTCAMP_APP_KEY");
    const gotKey = req.headers.get("x-bootcamp-key");
    if (appKey && gotKey !== appKey) return respond({ ok: false, error: "No autorizado" }, 401);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return respond({ error: "RESEND_API_KEY no configurado" }, 500);

    const p = await req.json().catch(() => null);
    if (!p || !p.to) return respond({ ok: false, error: "Falta 'to'" }, 400);

    const { asunto, html } = construir(p);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [p.to], subject: asunto, html }),
    });
    const data = await res.json().catch(() => ({}));
    return respond({ ok: res.ok, id: data.id, error: res.ok ? undefined : data });
  } catch (e) {
    return respond({ ok: false, error: String(e) }, 500);
  }
});
