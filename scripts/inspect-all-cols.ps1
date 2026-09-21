$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $password = "0123"
    $missing = [System.Type]::Missing
    
    $wb = $excel.Workbooks.Open($filePath, 0, $true, $missing, $password)
    $sheet = $wb.Sheets.Item("CAIXA (JUL)")
    
    $maxCol = $sheet.UsedRange.Columns.Count
    Write-Host "Used columns: $maxCol"
    
    Write-Host "`n=== HEADERS (Row 1 & Row 2) ==="
    for ($c = 1; $c -le $maxCol; $c++) {
        $h1 = $sheet.Cells.Item(1, $c).Text
        $h2 = $sheet.Cells.Item(2, $c).Text
        Write-Host "Col $c -> H1: '$h1' | H2: '$h2'"
    }
    
    Write-Host "`n=== ROW 24 (22/07/2026) ==="
    for ($c = 1; $c -le $maxCol; $c++) {
        $val = $sheet.Cells.Item(24, $c).Text
        $formula = $sheet.Cells.Item(24, $c).Formula
        if ($val -or $formula) {
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
