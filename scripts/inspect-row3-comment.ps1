$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $filePath = "C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx"
    $wb = $excel.Workbooks.Open($filePath, 0, $true, [System.Type]::Missing, "0123")
    $sheet = $wb.Sheets.Item("CAIXA (JUL)")
    
    Write-Host "=== COMMENTS / FORMULAS ON ROW 3 ==="
    for ($c = 42; $c -le 48; $c++) {
        $cell = $sheet.Cells.Item(3, $c)
        $t = $cell.Text
        $formula = $cell.Formula
        $comment = $cell.Comment
        $commentText = if ($comment) { $comment.Text() } else { "" }
        Write-Host "Col $($c): Val='$t' | Formula='$formula' | Comment='$commentText'"
    }
    
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
