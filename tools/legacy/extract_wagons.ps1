# Extracts wagon stats from script.ini (folders starting with w_ or containing vagon/wagon)
# Usage: powershell -File extract_wagons.ps1 [-Out wagons_current.csv]
param(
    [string]$Root = (Split-Path $PSScriptRoot -Parent),
    [string]$Out  = (Join-Path $PSScriptRoot 'wagons_current.csv')
)

$keys = 'TYPE','NAME','COST_RUB','COST_USD','RESOURCE_CAPACITY','MOVEMENT_EMPTY_WEIGHT','MOVEMENT_CONSPUMPTION',
        'AVAILABLE','COUNTRY','RESOURCE_TRANSPORT_TYPE'

$rows = Get-ChildItem -Path $Root -Recurse -Filter script.ini -File |
  Where-Object { $_.Directory.Name -match '(?i)^w_|vagon|wagon' -or (Select-String -Path $_.FullName -Pattern 'VEHICLETYPE_RAIL_VAGON' -Quiet) } |
  ForEach-Object {
    $txt = Get-Content $_.FullName
    $o = [ordered]@{
        Folder = $_.Directory.Name
        Path   = $_.Directory.FullName.Substring($Root.Length).TrimStart('\')
    }
    foreach ($k in $keys) {
        $m = $txt | Where-Object { $_ -match "^\s*\`$$k(\s|$)" } | Select-Object -First 1
        $o[$k] = if ($m) { ($m -replace "^\s*\`$$k\s*", '').Trim() -replace '\s+',' ' -replace '^(\d+),(\d+)$','$1.$2' } else { '' }
    }
    $o['Group'] = (($txt | Where-Object { $_ -match '^\s*\$TRAINGROUP_\w+' }) -replace '^\s*\$','' -join ' ').Trim()
    $o['PurchaseExcluded'] = [bool]($txt | Where-Object { $_ -match '^\s*\$PURCHASE_EXCLUDE' })
    [pscustomobject]$o
  }

$rows | Sort-Object Path | Export-Csv $Out -NoTypeInformation -Encoding UTF8
"Wagons: $($rows.Count) -> $Out"

