import fs from "fs";
import path from "path";

const dreRows = [
  ["DEMONSTRATIVO DE RESULTADO DA EXCURSÃO (DRE) - BALNEÁRIO CAMBORIÚ 10/2026"],
  ["Visão contábil consolidada entre receitas faturadas e custos diretos"],
  ["DESTINO CERTO VIAGENS", "REFERÊNCIA: OUTUBRO/2026", "EMISSÃO: " + new Date().toLocaleDateString("pt-BR")],
  [],
  ["CONTA / DISCRIMINAÇÃO CONTÁBIL", "VALOR (R$)", "PARTICIPAÇÃO (%)"],
  ["(+) RECEITAS OPERACIONAIS BRUTAS", "", ""],
  ["Receita com Pacotes (discriminado por idade)", "53.000,00", "99,89%"],
  ["Receita com Serviços Adicionais & Passeios", "60,00", "0,11%"],
  ["TOTAL DA RECEITA BRUTA", "53.060,00", "100,00%"],
  [],
  ["(-) CUSTOS OPERACIONAIS DIRETOS", "", ""],
  ["Aéreo (SAKURA)", "21.484,44", "47,48%"],
  ["Hospedagem (POUSADA ALVORADA)", "4.200,00", "9,28%"],
  ["Hospedagem (POUSADA DA CARMÔ)", "11.070,00", "24,46%"],
  ["Transporte Rodoviário 1 (Hygor Turismo)", "2.200,00", "4,86%"],
  ["Transporte Rodoviário 2 (ATALAIA)", "2.171,70", "4,80%"],
  ["Guias e Monitores ' (George Costa)", "2.240,14", "4,95%"],
  ["Personalizados (Personalizados / Brindes)", "950,00", "2,10%"],
  ["Custos de Adicionais / Ingressos Contratados", "30,00", "0,07%"],
  ["TOTAL DE CUSTOS DIRETOS", "(45.250,20)", "100,00%"],
  [],
  ["(=) RESULTADO OPERACIONAL LÍQUIDO", "7.809,80", "14,72%"],
  ["MARGEM LÍQUIDA REAL", "14,72%", ""],
  ["TICKET MÉDIO POR PASSAGEIRO", "2.653,00", ""],
  ["CUSTOS FIXOS DOS BLOCOS", "45.220,20", ""],
  ["PONTO DE EQUILÍBRIO (BREAK-EVEN)", "18 passageiros pagantes", "Meta Atingida (Zona de Lucro)"]
];

const csv = "\uFEFF" + dreRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");

const target1 = path.join(process.cwd(), "DRE_BALNEARIO_10_2026.csv");
try {
  fs.writeFileSync(target1, csv, "utf-8");
  console.log("Salvo com sucesso em:", target1);
} catch (e: any) {
  console.warn("DRE_BALNEARIO_10_2026.csv está aberto em outro programa. Salvando como DRE_SINTETICO_BALNEARIO_10_2026.csv...");
  const target2 = path.join(process.cwd(), "DRE_SINTETICO_BALNEARIO_10_2026.csv");
  fs.writeFileSync(target2, csv, "utf-8");
  console.log("Salvo com sucesso em:", target2);
}
