// Dibuja el radar de 4 dimensiones como SVG.
// Ejes: arriba=Integrador, derecha=Explorador, abajo=Constructor, izquierda=Esceptico.

const C = 100;      // centro
const R = 78;       // radio maximo
const EJES = [
  { clave: "integrador", label: "Integrador", dx: 0, dy: -1, tx: 100, ty: 13, anchor: "middle" },
  { clave: "explorador", label: "Explorador", dx: 1, dy: 0, tx: 195, ty: 103, anchor: "end" },
  { clave: "constructor", label: "Constructor", dx: 0, dy: 1, tx: 100, ty: 196, anchor: "middle" },
  { clave: "esceptico", label: "Esceptico", dx: -1, dy: 0, tx: 5, ty: 103, anchor: "start" },
];

export function radarSVG(dims) {
  const puntos = EJES.map((e) => {
    const v = (dims[e.clave] || 0) / 100;
    return `${C + e.dx * R * v},${C + e.dy * R * v}`;
  }).join(" ");

  const labels = EJES.map((e) =>
    `<text x="${e.tx}" y="${e.ty}" text-anchor="${e.anchor}" fill="#5b6b7f" font-size="11" font-family="Segoe UI, system-ui, sans-serif">${e.label}</text>`
  ).join("");

  return `
    <svg width="210" height="210" viewBox="0 0 200 200" role="img"
         aria-label="Radar de habilidades con IA en cuatro dimensiones">
      <polygon points="100,22 178,100 100,178 22,100" fill="none" stroke="rgba(0,144,218,.18)"/>
      <polygon points="100,61 139,100 100,139 61,100" fill="none" stroke="rgba(0,144,218,.14)"/>
      <line x1="100" y1="22" x2="100" y2="178" stroke="rgba(0,144,218,.12)"/>
      <line x1="22" y1="100" x2="178" y2="100" stroke="rgba(0,144,218,.12)"/>
      <polygon points="${puntos}" fill="rgba(0,144,218,.22)" stroke="#0090da" stroke-width="2"/>
      ${labels}
    </svg>
  `;
}
