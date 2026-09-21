$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $wb = $excel.Workbooks.Open($filePath, 0, $true, [System.Type]::Missing, "0123")
    $sheet = $wb.Sheets.Item("CAIXA (JUL)")
    
    Write-Host "=== ROW 3 (01/07/2026) RECEBIMENTOS & SAIDAS ==="
    for ($c = 25; $c -le 48; $c++) {
        $val = $sheet.Cells.Item(3, $c).Text
        $formula = $sheet.Cells.Item(3, $c).Formula
        $h1 = $sheet.Cells.Item(1, $c).Text
        $h2 = $sheet.Cells.Item(2, $c).Text
        if ($val -or $formula) {
            Write-Host "Col $c [$h1 / $h2] = '$val' | Formula: $formula"
        }
    }
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
