$files = Get-ChildItem 'C:\Users\Pablo\clawd\proyectos\pcfutbol-web\src\data\*.js'
foreach ($f in $files) {
    $matches = Select-String -Path $f.FullName -Pattern '"position":\s*"(LTI|LTD|MDD|MDI|EDD|EDI|MP)"' -AllMatches
    if ($matches.Count -gt 0) {
        Write-Host "$($f.Name): $($matches.Count) old positions found"
    }
}

# Also check context and game files
$otherFiles = Get-ChildItem 'C:\Users\Pablo\clawd\proyectos\pcfutbol-web\src' -Recurse -Include '*.js','*.jsx' | Where-Object { $_.FullName -notmatch 'node_modules' }
foreach ($f in $otherFiles) {
    $content = Get-Content $f.FullName -Raw
    if ($content -match "'(LTI|LTD|MDD|MDI|EDD|EDI)'") {
        Write-Host "CODE: $($f.Name) contains old position strings"
    }
}
