import { getDailyCash } from "../src/lib/actions/daily-cash";
import { execSync } from "child_process";
import * as fs from "fs";

interface ExcelRowData {
  row: number;
  date: string;
  operPacotes: number;
  operPassagens: number;
  operHoteis: number;
  operCarros: number;
  operSubtotal: number;
  planoAVista: number;
  planoPrazo: number;
  planoSubtotal: number;
  vendasAtend: number;
  vendasDinheiro: number;
  vendasCrediario: number;
  vendasCartao: number;
  vendasCartaoForn: number;
  vendasPix: number;
  vendasSubtotal: number;
  recDinheiro: number;
  recPix: number;
  recBoleto: number;
  recSubtotal: number;
  saidasSubtotal: number;
  saldoFinal: number;
}

async function main() {
  console.log("===============================================================================");
  console.log("  VALIDAÇÃO COMPLETA: SISTEMA (GETDAILYCASH) vs PLANILHA CAIXA 2026");
  console.log("  DIAS 01/07/2026, 02/07/2026 E 03/07/2026");
  console.log("===============================================================================\n");

  // PowerShell script to extract row data from Excel directly
  const psScript = `
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    try {
      $wb = $excel.Workbooks.Open('C:\\geo\\CAIXA 2026 (DESTINO CERTO).xlsx', 0, $true, [System.Type]::Missing, '0123')
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
  `;

  fs.writeFileSync("c:/geo/scripts/temp-read-excel.ps1", psScript, "utf-8");
  const rawExcel = execSync("powershell -ExecutionPolicy Bypass -File c:/geo/scripts/temp-read-excel.ps1", { encoding: "utf-8" });
  const excelData: ExcelRowData[] = JSON.parse(rawExcel);

  const dateMap: Record<string, string> = {
    "01/07/2026": "2026-07-01",
    "02/07/2026": "2026-07-02",
    "03/07/2026": "2026-07-03",
  };

  const results: any[] = [];

  for (const ex of excelData) {
    const isoDate = dateMap[ex.date];
    const sys = await getDailyCash(isoDate);

    const checks = [
      { section: "Operações", field: "Pacotes", excel: ex.operPacotes, sys: sys.operations.pacotes },
      { section: "Operações", field: "Passagens", excel: ex.operPassagens, sys: sys.operations.passagens },
      { section: "Operações", field: "Hotéis", excel: ex.operHoteis, sys: sys.operations.hoteis },
      { section: "Operações", field: "Aluguel Carros", excel: ex.operCarros, sys: sys.operations.aluguelCarros },
      { section: "Operações", field: "Subtotal Operações", excel: ex.operSubtotal, sys: sys.operations.subtotal },
      { section: "Vendas", field: "Atendimentos", excel: ex.vendasAtend, sys: sys.salesPayments.atendimentos },
      { section: "Vendas", field: "Dinheiro", excel: ex.vendasDinheiro, sys: sys.salesPayments.dinheiro },
      { section: "Vendas", field: "Crediário", excel: ex.vendasCrediario, sys: sys.salesPayments.crediario },
      { section: "Vendas", field: "Cartão", excel: ex.vendasCartao, sys: sys.salesPayments.cartao },
      { section: "Vendas", field: "Cartão Fornecedor", excel: ex.vendasCartaoForn, sys: sys.salesPayments.cartaoFornecedor },
      { section: "Vendas", field: "PIX", excel: ex.vendasPix, sys: sys.salesPayments.pix },
      { section: "Vendas", field: "Subtotal Vendas", excel: ex.vendasSubtotal, sys: sys.salesPayments.subtotal },
      { section: "Recebimentos", field: "Dinheiro", excel: ex.recDinheiro, sys: sys.receipts.dinheiro },
      { section: "Recebimentos", field: "PIX", excel: ex.recPix, sys: sys.receipts.pix },
      { section: "Recebimentos", field: "Boleto", excel: ex.recBoleto, sys: sys.receipts.boleto },
      { section: "Recebimentos", field: "Subtotal Recebimentos", excel: ex.recSubtotal, sys: sys.receipts.subtotal },
      { section: "Gaveta/Caixa", field: "Saídas Gaveta", excel: ex.saidasSubtotal, sys: sys.cashFlow.subtotalSaidas },
      { section: "Gaveta/Caixa", field: "Saldo Final Caixa", excel: ex.saldoFinal, sys: sys.cashFlow.saldoFinalCaixa },
    ];

    console.log(`\n📅 DATA: ${ex.date} (Linha ${ex.row} da Planilha)`);
    console.log("------------------------------------------------------------------------------------------------");
    console.log(
      `${"SEÇÃO".padEnd(16)} | ${"CAMPO".padEnd(22)} | ${"PLANILHA".padStart(12)} | ${"SISTEMA".padStart(12)} | ${"STATUS"}`
    );
    console.log("------------------------------------------------------------------------------------------------");

    let dayMatches = 0;
    let dayDiffs = 0;

    for (const c of checks) {
      const isMatch = Math.abs(c.excel - c.sys) < 0.01;
      if (isMatch) dayMatches++;
      else dayDiffs++;

      const status = isMatch ? "✅ EXATO" : `⚠️ DIF (${(c.sys - c.excel).toFixed(2)})`;
      console.log(
        `${c.section.padEnd(16)} | ${c.field.padEnd(22)} | ${c.excel.toFixed(2).padStart(12)} | ${c.sys.toFixed(2).padStart(12)} | ${status}`
      );
    }
    console.log("------------------------------------------------------------------------------------------------");
    console.log(`Resultado do dia: ${dayMatches} campos conferem 100% | ${dayDiffs} divergências`);

    results.push({ date: ex.date, row: ex.row, checks, dayMatches, dayDiffs });
  }

  fs.writeFileSync("c:/geo/scripts/comparison-results.json", JSON.stringify(results, null, 2), "utf-8");
  console.log("\nResultados salvos em c:/geo/scripts/comparison-results.json");
}

main().catch(console.error);
