$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $wb = $excel.Workbooks.Open($filePath, 0, $true, [System.Type]::Missing, "0123")
    $sheet = $wb.Sheets.Item("CAIXA (JUL)")
    
    Write-Host "=== ROWS 26 to 33 in CAIXA (JUL) ==="
    for ($r = 26; $r -le 33; $r++) {
        $d = $sheet.Cells.Item($r, 1).Text
        $vTot = $sheet.Cells.Item($r, 11).Text
        $rTot = $sheet.Cells.Item($r, 41).Text
        $sTot = $sheet.Cells.Item($r, 46).Text
        $saldo = $sheet.Cells.Item($r, 48).Text
        Write-Host "Row $r ($d): VendasTot='$vTot', RecTot='$rTot', Saidas='$sTot', Saldo='$saldo'"
    }
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
