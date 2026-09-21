$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $password = "0123"
    $missing = [System.Type]::Missing
    
    $wb = $excel.Workbooks.Open($filePath, 0, $true, $missing, $password)
    $sheet = $wb.Sheets.Item("CAIXA (JUL)")
    
    for ($r = 1; $r -le 6; $r++) {
        $cols = @()
        for ($c = 1; $c -le 35; $c++) {
            $t = $sheet.Cells.Item($r, $c).Text
            if ($t) {
                $cols += "C$($c)='$t'"
            }
        }
        Write-Host "HEADER ROW $($r): $($cols -join ' | ')"
    }
    
    Write-Host "`n=== ROW 24 (22/07/2026) FULL ==="
    $r24 = @()
    for ($c = 1; $c -le 35; $c++) {
        $t = $sheet.Cells.Item(24, $c).Text
        $formula = $sheet.Cells.Item(24, $c).Formula
        if ($t -or $formula) {
            $r24 += "C$($c)='$t' (Formula: $formula)"
        }
    }
    Write-Host ($r24 -join "`n")
    
    $wb.Close($false)
}
catch {
    Write-Host "Error: " $_.Exception.ToString()
}
finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
