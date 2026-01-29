$fnm = "C:\Users\Pablo\AppData\Local\Microsoft\WinGet\Packages\Schniz.fnm_Microsoft.Winget.Source_8wekyb3d8bbwe\fnm.exe"
$env:NODE_OPTIONS = ""
& $fnm env --use-on-cd | Out-String | Invoke-Expression
& $fnm use 18
node -v
Set-Location "C:\Users\Pablo\clawd\proyectos\checks2"
npm start
