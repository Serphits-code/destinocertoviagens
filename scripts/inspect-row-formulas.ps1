$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open('C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx', 0, $true, [System.Type]::Missing, '0123')
    $sheet = $wb.Sheets.Item('CAIXA (JUL)')
    for ($r = 3; $r -le 5; $r++) {
        $dt = $sheet.Cells.Item($r, 1).Text
        Write-Host "`n=================== ROW $r ($dt) ==================="
        for ($c = 13; $c -le 26; $c++) {
            $h2 = $sheet.Cells.Item(2, $c).Text
            $val = $sheet.Cells.Item($r, $c).Value2
            $formula = $sheet.Cells.Item($r, $c).Formula
            $comment = $sheet.Cells.Item($r, $c).Comment
            $commText = if ($comment) { $comment.Text() } else { "" }
            if ($val -ne $null -and $val -ne 0 -and $val -ne '' -or $commText) {
                Write-Host ('Col {0,2} ({1}): Val={2} | Formula={3} | Comment={4}' -f $c, $h2, $val, $formula, $commText)
            }
        }
    }
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
