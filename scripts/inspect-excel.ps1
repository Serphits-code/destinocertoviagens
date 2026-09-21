$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $password = "0123"
    $missing = [System.Type]::Missing
    
    # Open(string Filename, object UpdateLinks, object ReadOnly, object Format, object Password, ...)
    $wb = $excel.Workbooks.Open($filePath, 0, $true, $missing, $password)
    
    Write-Host "Total Sheets:" $wb.Sheets.Count
    foreach ($sheet in $wb.Sheets) {
        Write-Host "Sheet:" $sheet.Name "(Visible: $($sheet.Visible))"
    }
    
    $wb.Close($false)
}
catch {
    Write-Host "Error: " $_.Exception.ToString()
}
finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
