import re, sys

f = r'C:\Users\Pablo\clawd\proyectos\pcfutbol-web\src\components\Transfers\TransfersV2.jsx'

with open(f, 'rb') as fh:
    raw = fh.read()

# Try to decode as UTF-8
text = raw.decode('utf-8', 'replace')

# Fix double-encoded UTF-8 (bytes were read as Latin-1 then saved as UTF-8)
# This creates sequences like: Ã³ for ó, â€" for —, etc.
# Strategy: encode back to latin-1, then decode as utf-8
# But only for the broken sequences

replacements = {
    '\u00e2\u0080\u0094': '\u2014',  # — (em dash)
    '\u00e2\u0080\u0093': '\u2013',  # – (en dash)  
    '\u00e2\u0080\u009c': '\u201c',  # " left double quote
    '\u00e2\u0080\u009d': '\u201d',  # " right double quote
    '\u00e2\u0080\u0099': '\u2019',  # ' right single quote
    '\u00c3\u00b3': '\u00f3',  # ó
    '\u00c3\u00b1': '\u00f1',  # ñ
    '\u00c3\u00a9': '\u00e9',  # é
    '\u00c3\u00a1': '\u00e1',  # á
    '\u00c3\u00ad': '\u00ed',  # í
    '\u00c3\u00ba': '\u00fa',  # ú
    '\u00c3\u0089': '\u00c9',  # É
    '\u00c3\u008d': '\u00cd',  # Í
    '\u00c3\u009a': '\u00da',  # Ú
    '\u00c2\u00a1': '\u00a1',  # ¡
    '\u00c2\u00bf': '\u00bf',  # ¿
    '\u00c3\u00bc': '\u00fc',  # ü
}

# Also try the approach: find sequences that look like double-encoded UTF-8
# Pattern: \xC3\x80-\xBF -> single accented char
count = 0
for old, new in replacements.items():
    c = text.count(old)
    if c > 0:
        text = text.replace(old, new)
        count += c
        print(f'  {repr(old)} -> {new} ({repr(new)}): {c}')

# Also fix Ñ followed by combining chars (another double-encoding pattern)
# Ñ + š = Ú double-encoded as 2 chars
double_encoded = [
    ('\u00d1\u0161', '\u00da'),  # Ú 
    ('\u00d0\u00b8', 'и'),  # Cyrillic
]
for old, new in double_encoded:
    c = text.count(old)
    if c > 0:
        text = text.replace(old, new)
        count += c
        print(f'  {repr(old)} -> {new}: {c}')

print(f'\nTotal replacements: {count}')

# Check for remaining non-ASCII suspicious sequences
remaining = 0
for m in re.finditer(r'[\u0080-\u00ff]{2,}', text):
    s = m.group()
    # Skip valid Spanish chars
    if all(c in 'áéíóúñüÁÉÍÓÚÑÜ¡¿—–' for c in s):
        continue
    remaining += 1
    if remaining <= 20:
        ctx = text[max(0,m.start()-5):m.end()+5]
        print(f'  REMAINING at {m.start()}: {repr(ctx)}')

print(f'Remaining suspicious: {remaining}')

with open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(text)

print('File saved.')
