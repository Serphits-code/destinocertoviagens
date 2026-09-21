import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";

const prisma = new PrismaClient();

async function extractExcelMonthJul() {
  // PowerShell script to export CAIXA (JUL) to JSON
  const psScript = `
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    try {
      $wb = $excel.Workbooks.Open("C:\\geo\\CAIXA 2026 (DESTINO CERTO).xlsx", 0, $true, [System.Type]::Missing, "0123")
      $sheet = $wb.Sheets.Item("CAIXA (JUL)")
      $data = @()
      for ($r = 3; $r -le 33; $r++) {
        $dateText = $sheet.Cells.Item($r, 1).Text
        if ($dateText -and $dateText -match '^\\d{2}/\\d{2}/\\d{4}$') {
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
  `;

  fs.writeFileSync("c:/geo/scripts/temp-export.ps1", psScript);
  const jsonOut = execSync("powershell -ExecutionPolicy Bypass -File c:/geo/scripts/temp-export.ps1", {
    maxBuffer: 10 * 1024 * 1024,
  }).toString();

  const excelRows = JSON.parse(jsonOut);
  console.log(`Linhas lidas da planilha CAIXA (JUL): ${excelRows.length}\n`);

  let totalMatched = 0;
  let totalChecked = 0;

  for (const ex of excelRows) {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = ex.date.split("/");
    const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    const startOfDay = new Date(`${isoDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${isoDate}T23:59:59.999Z`);

    // Query DB financial entries for the day
    const entries = await prisma.financialEntry.findMany({
      where: {
        paidAt: { gte: startOfDay, lte: endOfDay },
        kind: "RECEBIMENTO",
      },
    });

    let dbVendasDin = 0;
    let dbRecDin = 0;
    let dbVendasPix = 0;
    let dbRecPix = 0;
    let dbRecBoleto = 0;

    for (const e of entries) {
      const val = Number(e.amount);
      const doc = (e.document || "").toUpperCase().trim();
      const meth = (e.paymentMethod || "").toUpperCase().trim();
      const issueDateStr = e.issueDate ? e.issueDate.toISOString().slice(0, 10) : "";
      const isVenda = issueDateStr === isoDate;

      if (doc === "DINHEIRO" || meth === "DINHEIRO") {
        if (isVenda) dbVendasDin += val;
        else dbRecDin += val;
      } else if (doc === "PIX" || meth === "PIX") {
        if (isVenda) dbVendasPix += val;
        else dbRecPix += val;
      } else if (doc === "BOLETO" || meth === "BOLETO") {
        if (!isVenda) dbRecBoleto += val;
      }
    }

    const exVendasDin = Number(ex.vendasDinheiro || 0);
    const exRecDin = Number(ex.recDinheiro || 0);
    const exVendasPix = Number(ex.vendasPix || 0);
    const exRecPix = Number(ex.recPix || 0);
    const exRecBoleto = Number(ex.recBoleto || 0);

    const dinVendaMatch = Math.abs(dbVendasDin - exVendasDin) < 0.05;
    const dinRecMatch = Math.abs(dbRecDin - exRecDin) < 0.05;
    const pixRecMatch = Math.abs(dbRecPix - exRecPix) < 0.05;

    console.log(`📅 ${ex.date} (Linha ${ex.row}):`);
    console.log(`   💵 Dinheiro Venda: DB=${dbVendasDin.toFixed(2)} | Planilha=${exVendasDin.toFixed(2)} -> ${dinVendaMatch ? "✅" : "❌"}`);
    console.log(`   💵 Dinheiro Rec:   DB=${dbRecDin.toFixed(2)} | Planilha=${exRecDin.toFixed(2)} -> ${dinRecMatch ? "✅" : "❌"}`);
    console.log(`   🟢 Pix Receb:      DB=${dbRecPix.toFixed(2)} | Planilha=${exRecPix.toFixed(2)} -> ${pixRecMatch ? "✅" : "❌"}`);

    totalChecked += 3;
    if (dinVendaMatch) totalMatched++;
    if (dinRecMatch) totalMatched++;
    if (pixRecMatch) totalMatched++;
  }

  console.log(`\n=======================================================`);
  console.log(`TOTAL DE CONCILIAÇÕES CONFERIDAS: ${totalMatched}/${totalChecked} (${((totalMatched/totalChecked)*100).toFixed(1)}%)`);
  console.log(`=======================================================`);

  await prisma.$disconnect();
}

extractExcelMonthJul().catch(console.error);
