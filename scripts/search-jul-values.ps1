$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $wb = $excel.Workbooks.Open($filePath, 0, $true, [System.Type]::Missing, "0123")
    $sheet = $wb.Sheets.Item("CAIXA (JUL)")
    
    Write-Host "Searching 2040 in CAIXA (JUL)..."
    for ($r = 3; $r -le 35; $r++) {
        for ($c = 1; $c -le 48; $c++) {
            $t = $sheet.Cells.Item($r, $c).Text
            if ($t -and ($t.Contains("2.040") -or $t.Contains("2040"))) {
                $date = $sheet.Cells.Item($r, 1).Text
                $h = $sheet.Cells.Item(2, $c).Text
                Write-Host "Row $r ($date) Col $c ($h): '$t'"
            }
        }
    }
    
    Write-Host "`nSearching 4310 in CAIXA (JUL)..."
    for ($r = 3; $r -le 35; $r++) {
        for ($c = 1; $c -le 48; $c++) {
            $t = $sheet.Cells.Item($r, $c).Text
            if ($t -and ($t.Contains("4.310") -or $t.Contains("4310"))) {
                $date = $sheet.Cells.Item($r, 1).Text
                $h = $sheet.Cells.Item(2, $c).Text
                Write-Host "Row $r ($date) Col $c ($h): '$t'"
            }
        }
    }
    
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
