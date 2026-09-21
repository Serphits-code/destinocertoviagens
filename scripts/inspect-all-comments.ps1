$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open('C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx', 0, $true, [System.Type]::Missing, '0123')
    $sheet = $wb.Sheets.Item('CAIXA (JUL)')
    for ($r = 3; $r -le 5; $r++) {
        for ($c = 1; $c -le 48; $c++) {
            $comment = $sheet.Cells.Item($r, $c).Comment
            if ($comment) {
                Write-Host ('Row {0} Col {1}: {2}' -f $r, $c, $comment.Text())
            }
        }
    }
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
