$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $wb = $excel.Workbooks.Open($filePath, 0, $true, [System.Type]::Missing, "0123")
    
    foreach ($sheetName in @("CAIXA (JUL)", "CAIXA (JUN)")) {
        $sheet = $wb.Sheets.Item($sheetName)
        Write-Host "=== $sheetName - NON-ZERO RECEBIMENTOS CARTAO (Col 34) ==="
        for ($r = 3; $r -le 35; $r++) {
            $val = $sheet.Cells.Item($r, 34).Text
            $valBank = $sheet.Cells.Item($r, 37).Text
            $date = $sheet.Cells.Item($r, 1).Text
            if ($val -and $val -ne " R$                      -   " -and $val -ne " R$                   -   ") {
                Write-Host "Row $r ($date) Col 34 (Cartao): '$val'"
            }
            if ($valBank -and $valBank -ne " R$                      -   " -and $valBank -ne " R$                   -   ") {
                Write-Host "Row $r ($date) Col 37 (Banco): '$valBank'"
            }
        }
    }
    
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
