// Canonical insurance names and the raw strings that map to them
const INSURANCE_MAP: [string, RegExp][] = [
  ["Aetna", /aetna/i],
  ["Blue Cross Blue Shield", /blue\s*cross|blue\s*shield|bcbs|bluecross|blueShield|empire blue/i],
  ["Cigna", /cigna|evernorth/i],
  ["UnitedHealthcare", /united\s*health|uhc|ubh|optum|oxford|umr/i],
  ["Oscar Health", /oscar/i],
  ["Humana", /humana/i],
  ["Magellan", /magellan/i],
  ["Carelon", /carelon|behavioral health systems|bhs/i],
  ["EmblemHealth", /emblem/i],
  ["Anthem", /anthem/i],
  ["Centivo", /centivo/i],
  ["MultiPlan", /multiplan|phcs/i],
  ["Medicare", /medicare/i],
  ["Medicaid", /medicaid/i],
  ["Tricare", /tricare/i],
  ["Out of Network", /out.of.network|out of network/i],
  ["Self Pay", /self.pay|private pay|sliding scale/i],
];

export const CANONICAL_INSURERS = INSURANCE_MAP.map(([name]) => name);

export function normalizeInsurance(raw: string[]): string[] {
  const normalized = new Set<string>();
  for (const item of raw) {
    // Skip noise strings
    if (item.length > 80 || item.startsWith("*") || item.startsWith("For ") || item.startsWith("My ")) {
      continue;
    }
    let matched = false;
    for (const [canonical, pattern] of INSURANCE_MAP) {
      if (pattern.test(item)) {
        normalized.add(canonical);
        matched = true;
        break;
      }
    }
    // Keep unrecognized values as-is if they look like a real insurer name
    if (!matched && item.length < 50 && /^[A-Z]/.test(item)) {
      normalized.add(item);
    }
  }
  return [...normalized];
}
