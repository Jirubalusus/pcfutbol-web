Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class WinEnum {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    public static List<string> results = new List<string>();
}
"@

$tvProc = Get-Process TeamViewer -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $tvProc) { Write-Output "No TV process"; exit }
$tvPid = $tvProc.Id
Write-Output "TeamViewer PID: $tvPid"

# Find all windows belonging to TeamViewer
$tvWindows = [System.Collections.ArrayList]::new()
$enumCallback = [WinEnum+EnumWindowsProc]{
    param($hwnd, $lparam)
    $pid = 0
    [WinEnum]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
    if ($pid -eq $tvPid) {
        $sb = New-Object System.Text.StringBuilder(256)
        [WinEnum]::GetWindowText($hwnd, $sb, 256) | Out-Null
        $title = $sb.ToString()
        $cb = New-Object System.Text.StringBuilder(256)
        [WinEnum]::GetClassName($hwnd, $cb, 256) | Out-Null
        $cls = $cb.ToString()
        $vis = [WinEnum]::IsWindowVisible($hwnd)
        $null = $tvWindows.Add("HWND=$hwnd VIS=$vis [$cls] '$title'")
        
        # Also enumerate children of this window
        $childCallback = [WinEnum+EnumWindowsProc]{
            param($chwnd, $clparam)
            $csb = New-Object System.Text.StringBuilder(256)
            [WinEnum]::GetWindowText($chwnd, $csb, 256) | Out-Null
            $ctxt = $csb.ToString()
            $ccb = New-Object System.Text.StringBuilder(256)
            [WinEnum]::GetClassName($chwnd, $ccb, 256) | Out-Null
            $ccls = $ccb.ToString()
            if ($ctxt -ne "") {
                $null = $tvWindows.Add("  CHILD HWND=$chwnd [$ccls] '$ctxt'")
            }
            return $true
        }
        [WinEnum]::EnumChildWindows($hwnd, $childCallback, [IntPtr]::Zero)
    }
    return $true
}

[WinEnum]::EnumWindows($enumCallback, [IntPtr]::Zero)

Write-Output "`nTeamViewer windows found: $($tvWindows.Count)"
foreach ($w in $tvWindows) {
    Write-Output $w
}
