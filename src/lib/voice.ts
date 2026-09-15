export type LunaState =
  | "off"
  | "wake"
  | "activated"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

const WAKE_TOKENS = new Set(["luna", "lunna", "luná", "lunah", "luma", "runa", "lhuna"]);

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detecta a palavra de ativação como palavra inteira (tolerante a pequenas variações). */
export function detectWake(text: string): { hit: boolean; rest: string } {
  const tokens = normalize(text).split(" ").filter(Boolean);
  const index = tokens.findIndex((t) => WAKE_TOKENS.has(normalize(t)));
  if (index === -1) return { hit: false, rest: "" };
  return { hit: true, rest: tokens.slice(index + 1).join(" ") };
}

export const STATE_LABEL: Record<LunaState, string> = {
  off: "Voz desligada",
  wake: 'Aguardando você dizer "Luna"',
  activated: "Luna ativada",
  listening: "Ouvindo você...",
  processing: "Processando...",
  speaking: "Luna falando...",
  error: "Microfone bloqueado",
};
