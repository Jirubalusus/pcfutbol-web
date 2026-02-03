$f = 'C:\Users\Pablo\clawd\proyectos\pcfutbol-web\src\components\Transfers\Transfers.jsx'
$lines = Get-Content $f

# Line numbers (1-indexed) where player.position is displayed in JSX
$targets = @(1201,1296,1443,1493,1531,1592,1647,1737,1816)

foreach($n in $targets) {
    $i = $n - 1
    $line = $lines[$i]
    # Replace {something.position} with {posES(something.position)} 
    # Also handle {something?.position || '?'}
    if ($line -match '\{') {
        $lines[$i] = $line -replace '\{([\w.?]+\.position)(\s*\|\|)', '{posES($1)$2' -replace '\{([\w.?]+\.position)\}', '{posES($1)}'
    }
}

Set-Content $f $lines
Write-Host "Done! Fixed $($targets.Count) lines"
