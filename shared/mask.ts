// Strip personal data before a message is analyzed, stored or shown on the big screen.
// Link hosts are kept on purpose: a fake domain like "correos-envio.info" is part of the lesson.
const RULES: [RegExp, string | ((m: string, ...groups: string[]) => string)][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]"],
  [/\b[A-Z]{2}\d{2}(?:\s?\d{4}){4,7}\b/gi, "[IBAN]"],
  [/\b(?:\d[ -]?){13,19}\b/g, "[tarjeta]"],
  [/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}\b/g, (m) => (m.replace(/\D/g, "").length >= 8 ? "[teléfono]" : m)],
  [/\bhttps?:\/\/([^\s/]+)\S*/gi, (_m, host: string) => `https://${host}/…`],
];

export function maskPersonalData(text: string): string {
  return RULES.reduce((out, [re, rep]) => out.replace(re, rep as never), text);
}
