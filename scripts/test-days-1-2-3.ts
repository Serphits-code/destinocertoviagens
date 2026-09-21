import { getDailyCash } from "../src/lib/actions/daily-cash";

async function main() {
  const dates = ["2026-07-01", "2026-07-02", "2026-07-03"];
  for (const dateStr of dates) {
    console.log(`\n=================== ${dateStr} ===================`);
    const data = await getDailyCash(dateStr);
    console.log("OPERATIONS:", data.operations);
    console.log("PLAN:", data.plan);
    console.log("SALES PAYMENTS:", data.salesPayments);
    console.log("RECEIPTS:", data.receipts);
    console.log("CASH FLOW:", data.cashFlow);
    console.log("BANK SUMMARY:", data.bankSummary);
  }
}

main().catch(console.error);
