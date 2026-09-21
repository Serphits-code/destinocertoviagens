$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $password = "0123"
    $missing = [System.Type]::Missing
    
    $wb = $excel.Workbooks.Open($filePath, 0, $true, $missing, $password)
    
    $sheetJul = $wb.Sheets.Item("CAIXA (JUL)")
    Write-Host "=== CAIXA (JUL) INFO ==="
    Write-Host "UsedRange rows:" $sheetJul.UsedRange.Rows.Count "cols:" $sheetJul.UsedRange.Columns.Count
    
    # Print first 20 rows of CAIXA (JUL) to see headers and structure
    for ($r = 1; $r -le 25; $r++) {
        $rowVals = @()
        for ($c = 1; $c -le 20; $c++) {
            $val = $sheetJul.Cells.Item($r, $c).Text
            if ($val) {
                $rowVals += "[$c]: $val"
            }
        }
        if ($rowVals.Count -gt 0) {
            Write-Host "Row $r -> $($rowVals -join ' | ')"
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
