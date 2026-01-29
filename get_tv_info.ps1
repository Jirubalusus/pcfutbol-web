Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
"@

$proc = Get-Process TeamViewer -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) {
    Write-Output "TeamViewer not running"
    exit
}

$mainHwnd = $proc.MainWindowHandle
Write-Output "Main window handle: $mainHwnd"
Write-Output "Window title: $($proc.MainWindowTitle)"

# Enumerate child windows
$results = [System.Collections.ArrayList]::new()
$callback = [Win32+EnumWindowsProc]{
    param($hwnd, $lparam)
    $sb = New-Object System.Text.StringBuilder(256)
    [Win32]::GetWindowText($hwnd, $sb, 256) | Out-Null
    $text = $sb.ToString()
    $cb = New-Object System.Text.StringBuilder(256)
    [Win32]::GetClassName($hwnd, $cb, 256) | Out-Null
    $className = $cb.ToString()
    if ($text -ne "") {
        $null = $results.Add("[$className] $text")
    }
    return $true
}

[Win32]::EnumChildWindows($mainHwnd, $callback, [IntPtr]::Zero)

Write-Output "`nChild window texts:"
foreach ($r in $results) {
    Write-Output $r
}
