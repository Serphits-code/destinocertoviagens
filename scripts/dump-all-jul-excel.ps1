$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open('C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx', 0, $true, [System.Type]::Missing, '0123')
    $sheet = $wb.Sheets.Item('CAIXA (JUL)')
    for ($r = 3; $r -le 33; $r++) {
        $dt = $sheet.Cells.Item($r, 1).Text
        if (-not $dt -or $dt -notmatch '^\d{2}/\d{2}/\d{4}$') { continue }
        $atend = $sheet.Cells.Item($r, 17).Value2
        $din = $sheet.Cells.Item($r, 18).Value2
        $cred = $sheet.Cells.Item($r, 19).Value2
        $cart = $sheet.Cells.Item($r, 20).Value2
        $cartForn = $sheet.Cells.Item($r, 21).Value2
        $pix = $sheet.Cells.Item($r, 22).Value2
        $sub = $sheet.Cells.Item($r, 26).Value2
        $recDin = $sheet.Cells.Item($r, 33).Value2
        $recPix = $sheet.Cells.Item($r, 36).Value2
        $recSub = $sheet.Cells.Item($r, 41).Value2
        $saidas = $sheet.Cells.Item($r, 46).Value2
        $saldo = $sheet.Cells.Item($r, 48).Value2

        Write-Host ('Day {0} (Row {1,2}): Atend={2} | Sub={3} | Cred={4} Cart={5} CartForn={6} Pix={7} Din={8} | RecSub={9} (Din={10} Pix={11}) | Saidas={12} | Saldo={13}' -f `
            $dt, $r, $atend, $sub, $cred, $cart, $cartForn, $pix, $din, $recSub, $recDin, $recPix, $saidas, $saldo)
    }
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
