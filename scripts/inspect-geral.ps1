$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $wb = $excel.Workbooks.Open($filePath, 0, $true, [System.Type]::Missing, "0123")
    $sheet = $wb.Sheets.Item("GERAL")
    
    Write-Host "=== GERAL SHEET INFO ==="
    Write-Host "Rows:" $sheet.UsedRange.Rows.Count "Cols:" $sheet.UsedRange.Columns.Count
    for ($r = 1; $r -le 25; $r++) {
        $rowVals = @()
        for ($c = 1; $c -le 20; $c++) {
            $t = $sheet.Cells.Item($r, $c).Text
            if ($t) { $rowVals += "[$c]: $t" }
        }
        if ($rowVals.Count -gt 0) {
            Write-Host "Row $r -> $($rowVals -join ' | ')"
        }
    }
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
