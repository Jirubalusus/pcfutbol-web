f = r'C:\Users\Pablo\clawd\proyectos\pcfutbol-web\src\components\Transfers\TransfersV2.jsx'

with open(f, 'r', encoding='utf-8') as fh:
    text = fh.read()

# Fix broken emoji/title patterns with the actual correct strings
fixes = [
    # Warning emoji ⚠️ in titles
    ("\u2161 \u20ac\u201d No se puede ceder", "No se puede ceder"),
    ("\u2161 \u20ac\u201d No se puede ejecutar", "No se puede ejecutar"),
    ("\u2161 \u20ac\u201d Cesi", "Cesi"),
    ("\u2161 \u20ac\u201d Presupuesto", "Presupuesto"),
]

# Better approach: just find the actual bytes and replace
# Let me do targeted line-based fixes

lines = text.split('\n')
count = 0
for i, line in enumerate(lines):
    orig = line
    
    # Fix warning titles - remove broken emoji, keep text
    if "title: '" in line and ("No se puede" in line or "Presupuesto" in line or "posible" in line or "insuficiente" in line):
        # Extract just the meaningful part after the broken chars
        import re
        m = re.search(r"title:\s*'[^']*'", line)
        if m:
            title_part = m.group()
            # Remove non-ASCII garbage before the actual text
            clean = re.sub(r"title:\s*'[^\x20-\x7e]*\s*", "title: '", title_part)
            line = line.replace(title_part, clean)
    
    # Fix rivalry badge
    if 'rivalry-badge' in line:
        line = re.sub(r'>.*?Rival directo', '>\u2694\ufe0f Rival directo', line)
    
    # Fix "última oportunidad" warning
    if 'last-round-warn' in line:
        line = re.sub(r'>.*?ltima oportunidad', '>\u26a0\ufe0f Última oportunidad', line)
    
    # Fix "Si rechazas" warning  
    if 'final-offer-warn' in line:
        line = re.sub(r'>.*?Si rechazas', '>\u26a0\ufe0f Si rechazas', line)
    
    if line != orig:
        lines[i] = line
        count += 1
        print(f'  Fixed line {i+1}')

text = '\n'.join(lines)

# Also fix any remaining broken ó in error messages
text = text.replace('Cesi\u00f3n no posible', 'Cesión no posible')

with open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(text)

print(f'Fixed {count} lines')
