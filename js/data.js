// Contenido de las 5 misiones. Todo editable aqui sin tocar la logica.

// Mision 1 - Arsenal de IA. Cartas de herramientas para clasificar.
export const HERRAMIENTAS = [
  { id: "claude", nombre: "Claude", icono: "ti-sparkles" },
  { id: "chatgpt", nombre: "ChatGPT", icono: "ti-message-2" },
  { id: "gemini", nombre: "Gemini", icono: "ti-diamond" },
  { id: "copilot", nombre: "GitHub Copilot", icono: "ti-brand-github-copilot" },
  { id: "cursor", nombre: "Cursor", icono: "ti-terminal-2" },
  { id: "midjourney", nombre: "Midjourney", icono: "ti-photo" },
  { id: "perplexity", nombre: "Perplexity", icono: "ti-search" },
  { id: "notionai", nombre: "Notion AI", icono: "ti-notebook" },
  { id: "n8n", nombre: "n8n / automatizacion", icono: "ti-share-2" },
  { id: "whisper", nombre: "Transcripcion por voz", icono: "ti-microphone" },
];

// Cofres donde caen las herramientas. El "peso" alimenta el puntaje.
export const COFRES = [
  { id: "diario", titulo: "La uso a diario", peso: 1.0 },
  { id: "probado", titulo: "La he probado", peso: 0.5 },
  { id: "desconozco", titulo: "No la conozco", peso: 0.0 },
];

// Mision 2 - Arbol de habilidades. Cada nodo se auto-evalua.
export const NODOS_SKILL = [
  { id: "prompting", nombre: "Prompting", desc: "Dar instrucciones claras y utiles a una IA." },
  { id: "rag", nombre: "RAG / documentos", desc: "Conectar la IA a tus propios documentos o datos." },
  { id: "agentes", nombre: "Agentes", desc: "IA que ejecuta tareas de varios pasos por si sola." },
  { id: "mcp", nombre: "MCP / herramientas", desc: "Conectar la IA a APIs y sistemas externos." },
  { id: "automatizacion", nombre: "Automatizacion", desc: "Encadenar IA con flujos de trabajo reales." },
];

// Niveles de dominio para el slider de cada nodo (indice = puntos).
export const NIVELES_SKILL = [
  { valor: 0, etiqueta: "No se que es" },
  { valor: 1, etiqueta: "Lo he visto" },
  { valor: 2, etiqueta: "Lo he hecho" },
  { valor: 3, etiqueta: "Lo domino" },
  { valor: 4, etiqueta: "Lo puedo enseñar" },
];

// Mision 3 - Caza de alucinaciones. Cada ronda: afirmaciones, marca las falsas.
export const RONDAS_ALUCINACION = [
  {
    contexto: "Le pedimos a una IA datos sobre una empresa. Marca lo que suena inventado.",
    afirmaciones: [
      { texto: "Ofrece seguros de vida y planes de retiro.", falsa: false },
      { texto: "Fue fundada por tres hermanos en un garaje en 1868.", falsa: true, porque: "Dato especifico y verificable que la IA no tenia; lo invento con seguridad." },
      { texto: "Opera en varios paises de America.", falsa: false },
    ],
  },
  {
    contexto: "Le pedimos a una IA que resuma una politica interna. Marca lo falso.",
    afirmaciones: [
      { texto: "El documento menciona un periodo de vigencia.", falsa: false },
      { texto: "La clausula 7.4 obliga a renovar cada 18 meses exactos.", falsa: true, porque: "Cito un numero de clausula y un plazo preciso que no estaban en el texto: alucinacion tipica." },
      { texto: "Incluye una seccion de definiciones al inicio.", falsa: false },
    ],
  },
];

// Mision 4 - Tu jugada real. Escenarios de trabajo; decide si usar IA y como.
// La respuesta "criterio" (saber cuando NO) suma a Esceptico; usar bien suma a Integrador.
export const ESCENARIOS = [
  {
    situacion: "Tienes que redactar 40 casos de prueba parecidos entre si.",
    opciones: [
      { texto: "Le pido a la IA que genere el borrador y yo reviso", integrador: 2, esceptico: 1 },
      { texto: "Lo hago a mano, no confio en el resultado", integrador: 0, esceptico: 1 },
      { texto: "No se por donde empezar con IA aqui", integrador: 0, esceptico: 0 },
    ],
  },
  {
    situacion: "Un cliente enviara datos personales sensibles para un tramite.",
    opciones: [
      { texto: "No pego esos datos en una IA publica", integrador: 1, esceptico: 3 },
      { texto: "Los pego para que la IA me ayude mas rapido", integrador: 1, esceptico: 0 },
      { texto: "No lo habia pensado", integrador: 0, esceptico: 0 },
    ],
  },
  {
    situacion: "Necesitas una decision de negocio con cifras exactas del ultimo trimestre.",
    opciones: [
      { texto: "Uso IA para estructurar, pero valido las cifras en la fuente", integrador: 2, esceptico: 3 },
      { texto: "Le creo las cifras que me da la IA", integrador: 1, esceptico: 0 },
      { texto: "No usaria IA para esto", integrador: 0, esceptico: 2 },
    ],
  },
];

// Mision 5 - Desafio del prompt. Arma un buen prompt eligiendo las piezas correctas.
export const PROMPT_RETO = {
  malo: "Hazme un correo.",
  instruccion: "Ese prompt es muy pobre. Elige las piezas que lo harian util.",
  piezas: [
    { id: "rol", texto: "Actua como agente de servicio al cliente", correcta: true },
    { id: "contexto", texto: "El cliente pide una prorroga de pago de 15 dias", correcta: true },
    { id: "formato", texto: "Devuelvelo en 4 lineas, tono cordial y formal", correcta: true },
    { id: "restriccion", texto: "No prometas descuentos ni fechas que no controlamos", correcta: true },
    { id: "ruido1", texto: "Escribe lo que quieras, tu decides todo", correcta: false },
    { id: "ruido2", texto: "Hazlo bonito", correcta: false },
  ],
};

// Arquetipos resultantes. El de dimension mas alta gana.
export const ARQUETIPOS = {
  explorador: {
    nombre: "Explorador",
    desc: "Curioso y con buen radar de herramientas. Prueba de todo.",
    recomendacion: "Aprovechalo como difusor: que muestre herramientas al equipo.",
  },
  constructor: {
    nombre: "Constructor",
    desc: "Sabe hacer, no solo usar. Prompting y tecnica solidos.",
    recomendacion: "Ideal para retos practicos y mentoria tecnica.",
  },
  esceptico: {
    nombre: "Esceptico",
    desc: "Piensa critico: verifica, cuida datos y sabe cuando no usar IA.",
    recomendacion: "Clave para casos sensibles y control de calidad.",
  },
  integrador: {
    nombre: "Integrador",
    desc: "Mete IA a su trabajo real y sabe cuando no usarla.",
    recomendacion: "Referente de casos de uso aterrizados en el dia a dia.",
  },
};

// ===================== Fase 2: progresion (aprender jugando) =====================

// Rangos por XP. El nombre se combina con el arquetipo (ej. "Explorador · Practico").
export const RANGOS = [
  { nivel: 1, nombre: "Novato", min: 0 },
  { nivel: 2, nombre: "Aprendiz", min: 200 },
  { nivel: 3, nombre: "Practico", min: 500 },
  { nivel: 4, nombre: "Maestro", min: 900 },
];

// XP que da cada tarea cumplida = nivel de la tarea * este factor.
export const XP_POR_NIVEL = 100;

// Escalera de retos por area. nivel 1 es el paso base del plan; aqui van los
// retos MAS DIFICILES que se desbloquean al cumplir (nivel 2 y 3).
// Al cumplir un reto nivel N de un area, se desbloquea RETOS_POR_AREA[area][N-1].
export const RETOS_POR_AREA = {
  "Herramientas": [
    { titulo: "Compara 3 herramientas", accion: "Resuelve una misma tarea real con 3 IAs distintas y anota cual gano y por que.", recurso: "Comparativa de modelos (Claude/GPT/Gemini) por tipo de tarea.", practica: "Documenta la comparacion en 5 lineas." },
    { titulo: "Arma tu stack personal", accion: "Define que herramienta usas para cada tipo de tarea y conviertelo en tu flujo.", recurso: "Ejemplos de stacks de IA por rol.", practica: "Comparte tu stack con el equipo." },
  ],
  "Skills": [
    { titulo: "Aplica el skill en un caso real", accion: "Toma el skill que reforzaste y aplicalo a un problema real de tu trabajo.", recurso: "Tutorial intermedio del tema.", practica: "Muestra el resultado concreto." },
    { titulo: "Ensena el skill", accion: "Explicalo a un companero o escribe una mini-guia de una pagina.", recurso: "Como estructurar una explicacion clara.", practica: "Comparte la guia." },
  ],
  "Pensamiento critico": [
    { titulo: "Detecta y corrige", accion: "Pidele algo a una IA, encuentra un error o dato inventado y corrigelo con fuente.", recurso: "Tecnicas para pedir citas y verificar.", practica: "Documenta el error y su correccion." },
    { titulo: "Tu checklist de verificacion", accion: "Crea una lista de lo que SIEMPRE verificas antes de usar output de IA.", recurso: "Ejemplos de checklists de verificacion.", practica: "Usala durante una semana." },
  ],
  "Criterio / riesgo": [
    { titulo: "Define tu linea roja de datos", accion: "Lista que datos NUNCA metes a una IA publica y por que.", recurso: "Basico de privacidad y datos con IA.", practica: "Compartelo con tu equipo." },
    { titulo: "Caso de uso seguro", accion: "Redisena un flujo real anonimizando datos para poder usar IA sin riesgo.", recurso: "Tecnicas de anonimizacion.", practica: "Documenta el antes/despues." },
  ],
  "Prompting": [
    { titulo: "Prompt con ejemplos", accion: "Mejora un prompt agregando 2 ejemplos de entrada y salida esperada.", recurso: "Few-shot prompting.", practica: "Compara el resultado con y sin ejemplos." },
    { titulo: "Cadena de prompts", accion: "Resuelve una tarea compleja partiendola en 3 prompts encadenados.", recurso: "Prompt chaining.", practica: "Documenta la cadena y el resultado." },
  ],
  "Integracion": [
    { titulo: "Automatiza un paso", accion: "Toma una tarea repetitiva y delega un paso a IA de forma estable.", recurso: "Casos de automatizacion por rol.", practica: "Mide cuanto tiempo ahorraste." },
    { titulo: "Integra al flujo del equipo", accion: "Propon como el equipo puede usar IA en un proceso comun.", recurso: "Playbooks de adopcion de IA.", practica: "Presenta la propuesta." },
  ],
  "Dimension": [
    { titulo: "Sube un escalon", accion: "Toma tu punto mas debil y ponte un reto concreto para esta semana.", recurso: "Material del tema del bootcamp.", practica: "Muestra tu avance." },
    { titulo: "Consolida", accion: "Repite el reto en un contexto distinto para afianzar lo aprendido.", recurso: "Ejercicios avanzados.", practica: "Documenta el resultado." },
  ],
};

// Orden de misiones para el flujo.
export const MISIONES = [
  { id: "m1", titulo: "Arma tu arsenal" },
  { id: "m2", titulo: "Arbol de habilidades" },
  { id: "m3", titulo: "Caza de alucinaciones" },
  { id: "m4", titulo: "Tu jugada real" },
  { id: "m5", titulo: "Desafio del prompt" },
];
