
# Fix hardcoded colors in SCSS/CSS files - replace with CSS variables
$root = "C:\Users\Pablo\proyectos\pcfutbol-web\proyectos\pcfutbol-web\src"

# Get all SCSS and CSS files
$files = Get-ChildItem -Path $root -Recurse -Include *.scss,*.css | Where-Object { $_.FullName -notmatch 'node_modules|dist|build' }

$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if (-not $content) { continue }
    $original = $content

    # === EXACT color mappings from classic.js ===
    
    # Background colors (exact hex)
    $content = $content -replace '#0c1424', 'var(--color-bg-primary)'
    $content = $content -replace '#101a2e', 'var(--color-bg-secondary)'
    $content = $content -replace '#152238', 'var(--color-bg-tertiary)'
    
    # Similar dark blues → bg-secondary or bg-tertiary
    $content = $content -replace '#0d1829', 'var(--color-bg-secondary)'
    $content = $content -replace '#0f1923', 'var(--color-bg-secondary)'
    $content = $content -replace '#1a2a40', 'var(--color-bg-tertiary)'
    $content = $content -replace '#0e1726', 'var(--color-bg-secondary)'
    $content = $content -replace '#111b2e', 'var(--color-bg-secondary)'
    $content = $content -replace '#0b1220', 'var(--color-bg-primary)'
    $content = $content -replace '#0a1020', 'var(--color-bg-primary)'
    $content = $content -replace '#131f35', 'var(--color-bg-tertiary)'
    $content = $content -replace '#192d48', 'var(--color-bg-tertiary)'
    $content = $content -replace '#1e3352', 'var(--color-bg-tertiary)'
    
    # Card backgrounds  
    $content = $content -replace 'rgba\(100,\s*140,\s*200,\s*0\.08\)', 'var(--color-bg-card)'
    $content = $content -replace 'rgba\(100,\s*140,\s*200,\s*0\.12\)', 'var(--color-bg-card-hover)'
    $content = $content -replace 'rgba\(100,\s*140,\s*200,\s*0\.1\b\)', 'var(--color-bg-card)'
    
    # Glass effects
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.03\)', 'var(--color-glass)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.06\)', 'var(--color-glass-border)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.05\)', 'var(--color-glass)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.04\)', 'var(--color-glass)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.08\)', 'var(--color-glass-border)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.07\)', 'var(--color-glass-border)'
    
    # Accent color
    $content = $content -replace '#00d4ff', 'var(--color-accent)'
    
    # Status colors
    $content = $content -replace '#30d158', 'var(--color-success)'
    $content = $content -replace '#ffd60a', 'var(--color-warning)'
    $content = $content -replace '#ff453a', 'var(--color-danger)'
    
    # Text colors
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.95\)', 'var(--color-text-primary)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.65\)', 'var(--color-text-secondary)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.6\b\)', 'var(--color-text-secondary)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.4\b\)', 'var(--color-text-tertiary)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.40\)', 'var(--color-text-tertiary)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.45\)', 'var(--color-text-tertiary)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.35\)', 'var(--color-text-tertiary)'
    $content = $content -replace 'rgba\(255,\s*255,\s*255,\s*0\.5\b\)', 'var(--color-text-secondary)'
    
    # White text - color: white or color: #fff  
    # Be careful: only replace color declarations, not background or border
    $content = $content -replace '(?<=color:\s*)white(?=\s*[;!])', 'var(--color-text-primary)'
    $content = $content -replace '(?<=color:\s*)#fff(?=[;\s!])', 'var(--color-text-primary)'
    $content = $content -replace '(?<=color:\s*)#ffffff(?=[;\s!])', 'var(--color-text-primary)'
    
    # Fix double-wrapped var() from fallback patterns like var(--color-accent, #00d4ff)
    # After replacement it becomes var(--color-accent, var(--color-accent))
    $content = $content -replace 'var\(--color-([a-z-]+),\s*var\(--color-[a-z-]+\)\)', 'var(--color-$1)'
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $relativePath = $file.FullName.Replace($root + "\", "")
        Write-Host "Fixed: $relativePath"
        $totalReplacements++
    }
}

Write-Host "`nTotal files modified: $totalReplacements"
