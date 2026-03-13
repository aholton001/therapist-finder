import re

INSURANCE_MAP = [
    ("Aetna", re.compile(r"aetna", re.I)),
    ("Blue Cross Blue Shield", re.compile(r"blue\s*cross|blue\s*shield|bcbs|bluecross|empire blue|excellus", re.I)),
    ("Cigna", re.compile(r"cigna|evernorth", re.I)),
    ("UnitedHealthcare", re.compile(r"united\s*health|uhc|ubh|optum|oxford|umr", re.I)),
    ("Oscar Health", re.compile(r"oscar", re.I)),
    ("Humana", re.compile(r"humana", re.I)),
    ("Magellan", re.compile(r"magellan", re.I)),
    ("Carelon", re.compile(r"carelon|behavioral health systems|bhs\b", re.I)),
    ("EmblemHealth", re.compile(r"emblem|ghi\b|group health inc", re.I)),
    ("Anthem", re.compile(r"anthem", re.I)),
    ("Centivo", re.compile(r"centivo", re.I)),
    ("MultiPlan", re.compile(r"multiplan|phcs", re.I)),
    ("Medicare", re.compile(r"medicare", re.I)),
    ("Medicaid", re.compile(r"medicaid", re.I)),
    ("Tricare", re.compile(r"tricare", re.I)),
    ("NYSHIP", re.compile(r"nyship|ny state empire", re.I)),
    ("Out of Network", re.compile(r"out.of.network", re.I)),
    ("Self Pay", re.compile(r"self.pay|private pay|sliding scale", re.I)),
]

_NOISE = re.compile(r"^\*|^For |^My |^Sessions |reimburs", re.I)


def normalize_insurance(raw: list[str]) -> list[str]:
    normalized: set[str] = set()
    for item in raw:
        item = item.strip()
        if not item or len(item) > 80 or _NOISE.search(item):
            continue
        matched = False
        for canonical, pattern in INSURANCE_MAP:
            if pattern.search(item):
                normalized.add(canonical)
                matched = True
                break
        if not matched and len(item) < 50 and item[0].isupper():
            normalized.add(item)
    return sorted(normalized)
