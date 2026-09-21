
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    try {
      $wb = $excel.Workbooks.Open("C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx", 0, $true, [System.Type]::Missing, "0123")
      $sheet = $wb.Sheets.Item("CAIXA (JUL)")
      $data = @()
      for ($r = 3; $r -le 33; $r++) {
        $dateText = $sheet.Cells.Item($r, 1).Text
        if ($dateText -and $dateText -match '^\d{2}/\d{2}/\d{4}$') {
          $rowObj = [PSCustomObject]@{
            row = $r
            date = $dateText
            atendimentos = $sheet.Cells.Item($r, 17).Value2
            vendasDinheiro = $sheet.Cells.Item($r, 18).Value2
            vendasCrediario = $sheet.Cells.Item($r, 19).Value2
            vendasCartao = $sheet.Cells.Item($r, 20).Value2
            vendasCartaoForn = $sheet.Cells.Item($r, 21).Value2
            vendasPix = $sheet.Cells.Item($r, 22).Value2
            vendasBanco = $sheet.Cells.Item($r, 23).Value2
            vendasBoleto = $sheet.Cells.Item($r, 24).Value2
            vendasCredito = $sheet.Cells.Item($r, 25).Value2
            vendasSubtotal = $sheet.Cells.Item($r, 26).Value2
            recDinheiro = $sheet.Cells.Item($r, 33).Value2
            recCartao = $sheet.Cells.Item($r, 34).Value2
            recCartaoForn = $sheet.Cells.Item($r, 35).Value2
            recPix = $sheet.Cells.Item($r, 36).Value2
            recBanco = $sheet.Cells.Item($r, 37).Value2
            recBoleto = $sheet.Cells.Item($r, 38).Value2
            recValeCredito = $sheet.Cells.Item($r, 39).Value2
            recSubtotal = $sheet.Cells.Item($r, 41).Value2
            saidas = $sheet.Cells.Item($r, 46).Value2
            saldoCaixa = $sheet.Cells.Item($r, 48).Value2
          }
          $data += $rowObj
        }
      }
      $wb.Close($false)
      $data | ConvertTo-Json -Depth 2
    } finally {
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
  