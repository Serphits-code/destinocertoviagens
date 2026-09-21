$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open('C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx', 0, $true, [System.Type]::Missing, '0123')
    $sheet = $wb.Sheets.Item('CAIXA (JUL)')
    for ($r = 3; $r -le 5; $r++) {
        $dt = $sheet.Cells.Item($r, 1).Text
        Write-Host "`n=== ROW $r ($dt) ==="
        for ($c = 1; $c -le 48; $c++) {
            $h1 = $sheet.Cells.Item(1, $c).Text
            $h2 = $sheet.Cells.Item(2, $c).Text
            $val = $sheet.Cells.Item($r, $c).Value2
            $txt = $sheet.Cells.Item($r, $c).Text
            if ($val -ne $null -and $val -ne 0 -and $val -ne '') {
                Write-Host ('Col {0,2} [{1} | {2}]: {3} (raw: {4})' -f $c, $h1, $h2, $txt, $val)
            }
        }
    }
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
