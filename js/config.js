// Configuracion del diagnostico. Editable sin tocar el resto del codigo.

export const CONFIG = {
  // Modo mock: no requiere backend. Simula el guardado y el tablero en vivo
  // para poder probar todo el flujo sin credenciales.
  // Cuando la tabla + Edge Function esten desplegadas: pon MOCK_MODE en false.
  MOCK_MODE: true,

  // Reusa el proyecto Supabase de Polibio (ya tiene OPENAI_API_KEY como secreto).
  // La anon key es publica por diseño (se protege con RLS).
  SUPABASE_URL: "https://hyylhendjtwdtflzsjdx.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_naAJyt5EoAiP2bZvGBgLvQ_L__8FeBN",

  // Nombre de la tabla donde se guarda el resultado final de cada jugador.
  TABLA: "bootcamp_diagnostico",

  // Edge Function que genera el plan de trabajo con OpenAI (solo la usa el admin).
  EDGE_PLAN_FN: "bootcamp-plan",
  // Mock del plan: genera un plan de ejemplo local sin llamar a OpenAI.
  // Se ignora si MOCK_MODE es false (ahi llama a la Edge Function real).
  MOCK_PLAN: true,

  // Correo (Resend, reusando Polibio). Remitente con marca Bootcamp IA.
  RESEND_FROM: "Bootcamp IA <noreply@metaiqcli.pro>",
  EDGE_EMAIL_FN: "bootcamp-email",       // envia el plan y los recordatorios
  EDGE_FOLLOWUP_FN: "bootcamp-followup", // revisor + recordatorios (cron)

  // Llave compartida para las Edge Functions (se despliegan --no-verify-jwt,
  // por lo que sin esto quedarian totalmente publicas). No es secreto fuerte
  // (vive en JS publico), pero evita que bots random las disparen y gasten
  // OpenAI/Resend. Debe coincidir con el secreto BOOTCAMP_APP_KEY en Supabase.
  APP_KEY: "KWweNcXohJaSv4hIpCs9qjOhwwQ8SHza",

  // Seguimiento de tareas: cadencia. Facil de cambiar aqui.
  TAREAS: {
    LIMITE_DIAS: 3,          // dias para entregar cada tarea
    RECORDATORIO_DIAS: 1,    // cada cuantos dias se recuerda si no entrega
    MAX_RECORDATORIOS: 3,    // tope de recordatorios por tarea
  },

  // Base publica para armar el link de seguimiento en los correos.
  // En produccion: la URL de GitHub Pages. En local se usa el origin actual.
  BASE_URL: "",

  // Codigo de sesion del grupo. Jugadores y facilitador que comparten el mismo
  // codigo se ven en el mismo tablero en vivo. Se puede sobreescribir con ?sesion= en la URL.
  SESION_DEFAULT: "bootcamp-01",

  // Titulo visible del evento.
  EVENTO: "Bootcamp de IA",
};

// Lee el codigo de sesion de la URL (?sesion=xxx) o usa el default.
export function getSesion() {
  const url = new URLSearchParams(window.location.search);
  return url.get("sesion") || CONFIG.SESION_DEFAULT;
}
