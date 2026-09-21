
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    try {
      $wb = $excel.Workbooks.Open('C:\geo\CAIXA 2026 (DESTINO CERTO).xlsx', 0, $true, [System.Type]::Missing, '0123')
      $sheet = $wb.Sheets.Item('CAIXA (JUL)')
      $rows = @()
      function GetVal($c) {
        $v = $sheet.Cells.Item($r, $c).Value2
        if ($null -eq $v -or $v -eq '') { return 0.0 }
        return [double]$v
      }
      foreach ($r in 3..5) {
        $rows += [PSCustomObject]@{
          row = $r
          date = $sheet.Cells.Item($r, 1).Text
          operPacotes = GetVal 2
          operPassagens = GetVal 3
          operHoteis = GetVal 4
          operCarros = GetVal 7
          operSubtotal = GetVal 11
          planoAVista = GetVal 13
          planoPrazo = GetVal 14
          planoSubtotal = GetVal 15
          vendasAtend = [int](GetVal 17)
          vendasDinheiro = GetVal 18
          vendasCrediario = GetVal 19
          vendasCartao = GetVal 20
          vendasCartaoForn = GetVal 21
          vendasPix = GetVal 22
          vendasSubtotal = GetVal 26
          recDinheiro = GetVal 33
          recPix = GetVal 36
          recBoleto = GetVal 38
          recSubtotal = GetVal 41
          saidasSubtotal = GetVal 46
          saldoFinal = GetVal 48
        }
      }
      $wb.Close($false)
      $rows | ConvertTo-Json
    } finally {
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
  