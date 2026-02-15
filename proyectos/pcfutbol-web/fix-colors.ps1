
# Fix hardcoded colors in SCSS files - replace with CSS variables
# CRITICAL: Do NOT replace colors inside SASS functions (rgba($var), darken(), lighten(), mix())

$projectRoot = "C:\Users\Pablo\proyectos\pcfutbol-web\proyectos\pcfutbol-web\src"

# Get all SCSS files
$files = Get-ChildItem -Recurse -Filter "*.scss" $projectRoot

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Skip replacing SCSS variable DEFINITIONS (lines like $var: #hex;)
    # We'll do line-by-line for safety
    $lines = $content -split "`n"
    $newLines = @()
    
    foreach ($line in $lines) {
        $l = $line
        
        # Skip lines that are SCSS variable definitions (keep hex for SASS function usage)
        # Skip lines with SASS functions: darken(), lighten(), mix(), rgba($
        if ($l -match '^\s*\$' -or $l -match 'darken\(' -or $l -match 'lighten\(' -or $l -match 'mix\(' -or $l -match 'rgba\(\$' -or $l -match 'color-mix\(') {
            $newLines += $l
            continue
        }
        
        # Dark background hex colors → CSS variables
        $l = $l -replace '#0c1424', 'var(--color-bg-primary)'
        $l = $l -replace '#0a1628', 'var(--color-bg-primary)'
        $l = $l -replace '#0a0f1a', 'var(--color-bg-primary)'
        $l = $l -replace '#101a2e', 'var(--color-bg-secondary)'
        $l = $l -replace '#0d1829', 'var(--color-bg-secondary)'
        $l = $l -replace '#0f1923', 'var(--color-bg-secondary)'
        $l = $l -replace '#0d1f35', 'var(--color-bg-secondary)'
        $l = $l -replace '#0d1f3c', 'var(--color-bg-secondary)'
        $l = $l -replace '#152238', 'var(--color-bg-tertiary)'
        $l = $l -replace '#1a2a40', 'var(--color-bg-tertiary)'
        $l = $l -replace '#1a2d45', 'var(--color-bg-tertiary)'
        $l = $l -replace '#1a2f4e', 'var(--color-bg-tertiary)'
        $l = $l -replace '#142435', 'var(--color-bg-tertiary)'
        $l = $l -replace '#1e3a58', 'var(--color-bg-card-hover)'
        $l = $l -replace '#2a4a6a', 'var(--color-glass-border)'
        $l = $l -replace '#1a3a5a', 'var(--color-bg-tertiary)'
        $l = $l -replace '#3a5a7a', 'var(--color-glass-border)'
        $l = $l -replace '#1a3a5c', 'var(--color-bg-tertiary)'
        
        # rgba(255, 255, 255, ...) patterns
        # 0.01-0.05 → var(--color-glass)
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.0[1-5]\)', 'var(--color-glass)'
        # 0.06-0.12 → var(--color-glass-border)
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.0[6-9]\)', 'var(--color-glass-border)'
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.1[0-2]?\)', 'var(--color-glass-border)'
        # 0.15 → var(--color-glass-border) (slightly brighter glass)
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.15\)', 'var(--color-glass-border)'
        # 0.2-0.25 → var(--color-glass-border)
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.2[0-5]?\)', 'var(--color-glass-border)'
        # 0.3 → var(--color-text-tertiary)
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.3[0-9]?\)', 'var(--color-text-tertiary)'
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.4[0-9]?\)', 'var(--color-text-tertiary)'
        # 0.5-0.6 → var(--color-text-secondary)
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.5[0-9]?\)', 'var(--color-text-secondary)'
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.6[0-9]?\)', 'var(--color-text-secondary)'
        # 0.7-0.8 → var(--color-text-secondary)
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.7[0-9]?\)', 'var(--color-text-secondary)'
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.8[0-9]?\)', 'var(--color-text-secondary)'
        # 0.9+ → var(--color-text-primary)
        $l = $l -replace 'rgba\(255,\s*255,\s*255,\s*0\.9[0-9]?\)', 'var(--color-text-primary)'
        
        $newLines += $l
    }
    
    $newContent = $newLines -join "`n"
    
    if ($newContent -ne $original) {
        Set-Content $file.FullName -Value $newContent -NoNewline
        Write-Host "Fixed: $($file.Name)"
    }
}

Write-Host "Done!"
