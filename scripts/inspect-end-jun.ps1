$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $wb = $excel.Workbooks.Open($filePath, 0, $true, [System.Type]::Missing, "0123")
    $sheet = $wb.Sheets.Item("CAIXA (JUN)")
    
    $lastRow = $sheet.UsedRange.Rows.Count
    Write-Host "CAIXA (JUN) rows: $lastRow"
    for ($r = [Math]::Max(1, $lastRow - 5); $r -le $lastRow; $r++) {
        $d = $sheet.Cells.Item($r, 1).Text
        $saldo = $sheet.Cells.Item($r, 48).Text
        $formula = $sheet.Cells.Item($r, 48).Formula
        Write-Host "Row $r -> Data: '$d' | Saldo: '$saldo' | Formula: '$formula'"
    }
    
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
