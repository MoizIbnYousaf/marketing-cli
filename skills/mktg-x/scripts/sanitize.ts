// Terminal-escape sanitization — prevent injection via OSC 52 clipboard writes, CSI screen clears, etc.
const ESC_SEQ_RE = /\x1b(?:[\[\]_P\^X][^\x07\x1b]*(?:\x1b\\|\x07)?|[@-_~])/g;
const C1_RE = /[\x80-\x9f]/g;
const CTRL_CHAR_RE = /[\x00-\x08\x0b-\x1f\x7f]/g;

export function sanitizeText(input: string | number | undefined | null): string {
  if (input == null) return "";
  const str = typeof input === "string" ? input : String(input);
  return str
    .replace(ESC_SEQ_RE, "")
    .replace(C1_RE, "")
    .replace(CTRL_CHAR_RE, "")
    .replace(/\x1b/g, "");
}
