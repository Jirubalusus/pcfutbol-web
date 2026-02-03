# Fix old Spanish position names in data files → English
$dataDir = 'C:\Users\Pablo\clawd\proyectos\pcfutbol-web\src\data'
$files = Get-ChildItem "$dataDir\*.js"

$replacements = @{
    "'LTD'" = "'RB'"
    "'LTI'" = "'LB'"
    "'MDD'" = "'RM'"
    "'MDI'" = "'LM'"
    "'EDD'" = "'RW'"
    "'EDI'" = "'LW'"
    "'MP'" = "'CF'"
}

$total = 0
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $changed = $false
    foreach ($old in $replacements.Keys) {
        if ($content -match $old) {
            $content = $content -replace $old, $replacements[$old]
            $changed = $true
        }
    }
    if ($changed) {
        Set-Content $f.FullName $content -NoNewline
        $total++
        Write-Host "Fixed: $($f.Name)"
    }
}
Write-Host "Done! Fixed $total files"
