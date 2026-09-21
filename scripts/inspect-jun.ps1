$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $wb = $excel.Workbooks.Open($filePath, 0, $true, [System.Type]::Missing, "0123")
    $sheet = $wb.Sheets.Item("CAIXA (JUN)")
    
    Write-Host "=== CAIXA (JUN) SAMPLE ROWS ==="
    for ($r = 3; $r -le 10; $r++) {
        $d = $sheet.Cells.Item($r, 1).Text
        $vTot = $sheet.Cells.Item($r, 11).Text
        $dinV = $sheet.Cells.Item($r, 18).Text
        $pixV = $sheet.Cells.Item($r, 22).Text
        $dinR = $sheet.Cells.Item($r, 33).Text
        $pixR = $sheet.Cells.Item($r, 36).Text
        $bolR = $sheet.Cells.Item($r, 38).Text
        $saidas = $sheet.Cells.Item($r, 46).Text
        $saldo = $sheet.Cells.Item($r, 48).Text
        Write-Host "Row $r ($d): Vendas='$vTot', DinV='$dinV', PixV='$pixV', DinR='$dinR', PixR='$pixR', BolR='$bolR', Saidas='$saidas', Saldo='$saldo'"
    }
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
