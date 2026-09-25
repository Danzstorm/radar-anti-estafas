import type { Round, ScamType, Verdict } from "../../shared/types";

export const SCAM_LABEL: Record<ScamType, string> = {
  family_impersonation: "Falso familiar",
  bank_phishing: "Falso banco",
  parcel_delivery: "Paquete falso",
  prize_lottery: "Premio falso",
  investment: "Inversión milagrosa",
  job_offer: "Chamba falsa",
  legitimate: "Mensaje normal",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  scam: "Estafa",
  doubtful: "Dudoso",
  safe: "Normal",
};

/** Zone colors on the radar and verdict colors everywhere else: one meaning per color. */
export const VERDICT_COLOR: Record<Verdict, string> = {
  scam: "var(--color-r3)",
  doubtful: "var(--color-r1)",
  safe: "var(--color-r0)",
};

export const ZONE_NAME: Record<Verdict, string> = {
  scam: "roja",
  doubtful: "amarilla",
  safe: "verde",
};

export const PRESSURE_LEVELS = ["Sin presión", "Presión leve", "Presión fuerte", "Presión extrema"];

export interface Mission {
  title: string;
  hint: string;
  chips: string[];
  examples: string[];
}

// Written the way these messages actually arrive in Peru: informal, with typos, emojis and local brands.
const SCAMS = [
  "Hola ma, soy yo, se me malogró el cel y estoy con este número nomás. Me puedes yapear 350 al toque? Es para algo urgente de la u, en la noche te explico 🙏",
  "BCP: Estimado cliente, detectamos un consumo no reconocido de S/ 1,249.90 en su tarjeta. Si no lo reconoce valide su identidad aquí: https://bcp-seguridad-pe.com/validar",
  "Olva Courier: Tu paquete N° 48213 no pudo ser entregado por dirección incompleta. Regulariza S/ 4.50 en https://olva-entregas.info en 24h o será devuelto.",
  "Felicidades!! 🎉 Ud. fue seleccionado ganador de un iPhone 16 en el sorteo por aniversario de Plaza Vea. Para reclamar su premio pague el envío de S/ 19.90",
  "Buenas, le saluda Karina de RR.HH. Tenemos una chamba remota, ganas S/ 150 diarios solo dando like a videos de YouTube. Te interesa? Te paso los detalles 😊",
  "Causa, métete a mi grupo de trading, pones 500 y en una semana te devuelven 2 mil. Yo ya saqué mi plata, confía 💸",
];

const LOOKALIKES = [
  "Ma, ya llegué a Arequipa, todo bien. Se me acabaron los datos, cuando puedas yapéame 20 soles para recargar, no es urgente 😘",
  "Interbank: Tu código de verificación es 482913. No lo compartas con nadie, ni siquiera con personal del banco.",
  "Oe, mañana vence el recibo de la luz. Lo pago yo con mi tarjeta y me yapeas tu parte cuando puedas.",
  "SUNAT: Recuerda que tu declaración anual de renta vence el 12 de mayo. Preséntala en sunat.gob.pe con tu clave SOL.",
];

export const MISSIONS: Partial<Record<Round, Mission>> = {
  real: {
    title: "Pega un mensaje sospechoso que te haya llegado",
    hint: "De WhatsApp, SMS o correo. Tapamos números, correos y tarjetas antes de analizarlo.",
    chips: ["Hola ma, soy yo…", "Yapéame al toque…", "BCP: detectamos…", "Tu paquete no pudo…"],
    examples: SCAMS,
  },
  fool: {
    title: "Escribe la estafa más creíble que se te ocurra",
    hint: "Hazla sutil, sin prisas ni links raros. A ver si engañas a la IA.",
    chips: ["Buenas, le saluda…", "Felicidades, ganaste…", "Hay una chamba…", "Invierte y gana…"],
    examples: SCAMS,
  },
  falsePositive: {
    title: "Escribe un mensaje normal que parezca estafa",
    hint: "Algo real y legítimo que igual te haría dudar. ¿La IA se confunde?",
    chips: ["Ma, ya llegué…", "Tu código es…", "Mañana vence…", "Te yapeo lo del…"],
    examples: LOOKALIKES,
  },
};

export const ROUND_LABEL: Record<Round, string> = {
  lobby: "Sala de espera",
  real: "Ronda 1 · Mensajes reales",
  fool: "Ronda 2 · Engaña a la IA",
  falsePositive: "Ronda 3 · ¿Parece estafa?",
  results: "Resultados",
};

/** What the presenter says and looks for in each round, shown only on /control. */
export const ROUND_SCRIPT: Record<Round, string[]> = {
  lobby: [
    "Proyecta /pantalla y pide a todos que escaneen el QR.",
    "Pueden ir reaccionando con los emojis mientras esperan.",
    "Cuando la mayoría esté conectada, pasa a la Ronda 1.",
  ],
  real: [
    "«Peguen un mensaje sospechoso que les haya llegado de verdad».",
    "Cada mensaje sale en grande y cae al radar: lejos del centro = más probable que sea estafa.",
    "Comenta los que caen en la zona roja: ¿a quién le llegó uno así?",
  ],
  fool: [
    "Reto: «escriban la estafa más creíble, sin prisas ni links raros».",
    "Busca ecos en la zona amarilla: ahí la IA duda. Muestra su probabilidad y su seguridad.",
    "Mensaje clave: la IA no escribe, decide, y te dice qué tan segura está.",
  ],
  falsePositive: [
    "Reto: «escriban un mensaje normal que parezca estafa».",
    "Si alguno cae en la zona roja es un falso positivo: la IA también se equivoca.",
    "Por eso el código decide los umbrales y un humano revisa lo dudoso.",
  ],
  results: [
    "Lee el parte final: % de estafas, tipo más común y si la sala acertó.",
    "Remata con el costo: toda la sala cuesta una fracción de centavo y cada respuesta tarda milisegundos.",
  ],
};

export const pct =(x: number) => `${Math.round(x * 100)}%`;
export const usd = (x: number) => `US$ ${x < 0.01 ? x.toFixed(5) : x.toFixed(2)}`;

/** Same three zones as the radar and the verdicts: green normal, yellow doubtful, red scam. */
export function riskColor(p: number): string {
  if (p >= 0.7) return "var(--color-r3)";
  if (p >= 0.3) return "var(--color-r1)";
  return "var(--color-r0)";
}
