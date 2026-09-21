$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $password = "0123"
    $missing = [System.Type]::Missing
    
    $wb = $excel.Workbooks.Open($filePath, 0, $true, $missing, $password)
    $sheet = $wb.Sheets.Item("CAIXA (JUL)")
    
    Write-Host "=== ROW 16 (14/07/2026) ==="
    for ($c = 1; $c -le 48; $c++) {
        $val = $sheet.Cells.Item(16, $c).Text
        $formula = $sheet.Cells.Item(16, $c).Formula
        if ($val) {
            $h1 = $sheet.Cells.Item(1, $c).Text
            $h2 = $sheet.Cells.Item(2, $c).Text
            Write-Host "Col $c [$h1 / $h2] = '$val' | Formula: $formula"
        }
    }
    
    $wb.Close($false)
}
catch {
    Write-Host "Error: " $_.Exception.ToString()
}
finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
