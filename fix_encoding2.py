import sys

f = r'C:\Users\Pablo\clawd\proyectos\pcfutbol-web\src\components\Transfers\TransfersV2.jsx'

with open(f, 'r', encoding='utf-8') as fh:
    text = fh.read()

# Fix remaining issues
replacements = [
    # Â· should be · (middle dot) - Â is a double-encode artifact
    ('\u00c2\u00b7', '\u00b7'),  # Â· -> ·
    # MÑ\x81S -> MÁS  (double-encoded Á)
    ('M\u00d1\u0081S', 'MÁS'),
    # â\x9a\ï¸\x8f -> ⚠️ (warning emoji double-encoded)
    # Let's just fix the specific strings
]

count = 0
for old, new in replacements:
    c = text.count(old)
    if c > 0:
        text = text.replace(old, new)
        count += c
        print(f'  {repr(old)} -> {repr(new)}: {c}')

# Fix specific broken emoji sequences
# ⚠️ warning sign - various broken forms
broken_warning = [
    '\u00e2\u0161\u00a0\u00ef\u00b8\u008f',  # â š ï¸\x8f
    '\u00e2\u0161\u00a0\u00ef\u00b8\x8f',
]
for bw in broken_warning:
    c = text.count(bw)
    if c > 0:
        text = text.replace(bw, '\u26a0\ufe0f')
        count += c
        print(f'  warning emoji fix: {c}')

# ⚔️ swords emoji
broken_swords = [
    '\u00e2\u0161\u201d\u00ef\u00b8\x8f',
]
for bs in broken_swords:
    c = text.count(bs)
    if c > 0:
        text = text.replace(bs, '\u2694\ufe0f')
        count += c
        print(f'  swords emoji fix: {c}')

print(f'\nTotal: {count}')

with open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(text)
print('Saved.')
