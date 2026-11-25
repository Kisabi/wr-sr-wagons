# Длина/ширина/высота модели из .nmf (берётся bbox мешей из заголовка).
# Использование:
#   .\nmf_length.ps1                      - все main.nmf в подпапках, таблица
#   .\nmf_length.ps1 russian_vagon_open   - одна папка
param([string[]]$Names)

function Get-NmfBox([string]$f) {
    $b = [IO.File]::ReadAllBytes($f)
    $boxes = @()
    # вариант 1: "B3DMH", перед матрицами маркер ff ff 00 00 -> bbox через 0x84
    for ($o = 64; $o -lt $b.Length - 0x90; $o++) {
        if ($b[$o] -eq 255 -and $b[$o+1] -eq 255 -and $b[$o+2] -eq 0 -and $b[$o+3] -eq 0 -and $b[$o-64] -ge 32 -and $b[$o-64] -lt 127) {
            $boxes += ,(0..5 | ForEach-Object { [BitConverter]::ToSingle($b, $o + 0x84 + 4*$_) })
        }
    }
    if ($boxes.Count -gt 0) { return ,$boxes }
    # вариант 2: "fromObj", две единичные матрицы 4x4 подряд -> bbox сразу за ними
    for ($o = 0; $o -lt $b.Length - 0xA0; $o += 4) {
        $ok = $true
        foreach ($k in 0,0x14,0x28,0x3c,0x40,0x54,0x68,0x7c) {
            if ([BitConverter]::ToSingle($b, $o + $k) -ne 1.0) { $ok = $false; break }
        }
        if ($ok) { $boxes += ,(0..5 | ForEach-Object { [BitConverter]::ToSingle($b, $o + 0x80 + 4*$_) }) }
    }
    return ,$boxes
}

$root = $PSScriptRoot
if (-not $Names) { $Names = Get-ChildItem $root -Directory | Select-Object -ExpandProperty Name }
foreach ($n in $Names) {
    $f = Join-Path $root "$n\main.nmf"
    if (-not (Test-Path $f)) { continue }
    $boxes = Get-NmfBox $f
    if (-not $boxes) { [pscustomobject]@{ Name=$n; Length='?'; Width='?'; Height='?' }; continue }
    $minx = ($boxes | ForEach-Object { $_[0] } | Measure-Object -Minimum).Minimum
    $miny = ($boxes | ForEach-Object { $_[1] } | Measure-Object -Minimum).Minimum
    $minz = ($boxes | ForEach-Object { $_[2] } | Measure-Object -Minimum).Minimum
    $maxx = ($boxes | ForEach-Object { $_[3] } | Measure-Object -Maximum).Maximum
    $maxy = ($boxes | ForEach-Object { $_[4] } | Measure-Object -Maximum).Maximum
    $maxz = ($boxes | ForEach-Object { $_[5] } | Measure-Object -Maximum).Maximum
    [pscustomobject]@{ Name=$n; Length=[math]::Round($maxz-$minz,2); Width=[math]::Round($maxx-$minx,2); Height=[math]::Round($maxy-$miny,2) }
}
