/** Every competition Jamhoor carries, in the order fans in the Gulf care about them. Names live in i18n as comp.<CODE>. */
export const COMPETITIONS = [
  "AGC", "UPL", "SPL", "ACL", "CL", "UNL", "PL", "PD", "SA", "BL1", "FL1",
  "TSL", "LPL", "QSL", "KPL", "BPL", "OPL", "ULC", "SKC", "PPL", "DED",
] as const;

export const isKnownComp = (code?: string | null): code is (typeof COMPETITIONS)[number] =>
  !!code && (COMPETITIONS as readonly string[]).includes(code);

/** Localised competition name: the translated name for competitions we know, otherwise the feed's own name. */
export function compLabel(t: (k: never) => string, code?: string | null, name?: string | null) {
  return isKnownComp(code) ? t(`comp.${code}` as never) : name ?? "";
}
