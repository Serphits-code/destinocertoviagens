# Relatório de Conciliação e Análise de Divergências: Sistema vs Planilha Caixa 2026
**Período Analisado:** Dias 01/07/2026, 02/07/2026 e 03/07/2026  
**Fonte da Planilha:** `CAIXA 2026 (DESTINO CERTO).xlsx` — Aba `CAIXA (JUL)` (Linhas 3, 4 e 5)  
**Data da Análise:** 17/09/2026

---

## 1. Resumo Executivo da Validação

Foram testados **54 campos** (18 colunas principais por dia) comparando o cálculo automático do sistema (`getDailyCash`) diretamente contra os valores da planilha do Caixa da agência.

| Data | Linha Excel | Campos Validados | 100% Exatos | Divergências | Subtotal Operações | Subtotal Vendas | Subtotal Recebimentos | Saldo Final Gaveta |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **01/07/2026** | Linha 3 | 18 | **18 (100%)** | 0 | **R$ 6.350,72** ✅ | **R$ 6.350,72** ✅ | **R$ 14.967,52** ✅ | **R$ 21.000,15** ✅ |
| **02/07/2026** | Linha 4 | 18 | **16 (88.9%)**| 2* | **R$ 8.181,50** ✅ | **R$ 8.181,50** ✅ | **R$ 1.600,00** ✅ | **R$ 21.300,15** ✅ |
| **03/07/2026** | Linha 5 | 18 | **18 (100%)** | 0 | **R$ 2.005,93** ✅ | **R$ 2.005,93** ✅ | **R$ 2.780,00** ✅ | **R$ 22.964,15** ✅ |
| **TOTAL** | — | **54** | **52 (96.3%)**| **2\*** | **R$ 16.538,15** ✅ | **R$ 16.538,15** ✅ | **R$ 19.347,52** ✅ | **R$ 22.964,15** ✅ |

*\*A única divergência encontrada no dia 02/07 é meramente classificatória interna entre Cartão e Crediário (a soma de ambos bate 100% em R$ 4.166,00).*

---

## 2. Tabela Detalhada Célula a Célula

### Dia 01/07/2026 (Linha 3 da Planilha)

| Seção | Coluna Excel | Campo | Valor Planilha | Valor Sistema | Diferença | Status |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **Operações** | Col 2 | Pacotes | R$ 4.310,00 | R$ 4.310,00 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 3 | Passagens | R$ 2.040,72 | R$ 2.040,72 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 4 | Hotéis | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 7 | Aluguel Carros | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 11 | **Subtotal Operações** | **R$ 6.350,72** | **R$ 6.350,72** | **R$ 0,00** | ✅ 100% Exato |
| **Vendas** | Col 17 | Atendimentos | 2 | 2 | 0 | ✅ 100% Exato |
| **Vendas** | Col 18 | Dinheiro | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 19 | Crediário | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 20 | Cartão Agência | R$ 4.310,00 | R$ 4.310,00 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 21 | Cartão Fornecedor | R$ 2.040,72 | R$ 2.040,72 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 22 | PIX | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 26 | **Subtotal Vendas** | **R$ 6.350,72** | **R$ 6.350,72** | **R$ 0,00** | ✅ 100% Exato |
| **Recebimentos** | Col 33 | Dinheiro | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Recebimentos** | Col 36 | PIX | R$ 12.926,09 | R$ 12.926,09 | R$ 0,00 | ✅ 100% Exato |
| **Recebimentos** | Col 38 | Boleto | R$ 2.041,43 | R$ 2.041,43 | R$ 0,00 | ✅ 100% Exato |
| **Recebimentos** | Col 41 | **Subtotal Recebimentos** | **R$ 14.967,52** | **R$ 14.967,52** | **R$ 0,00** | ✅ 100% Exato |
| **Gaveta/Caixa** | Col 44/46 | Saídas Pagamentos | R$ 384,00 | R$ 384,00 | R$ 0,00 | ✅ 100% Exato |
| **Gaveta/Caixa** | Col 48 | **Saldo Final Caixa** | **R$ 21.000,15** | **R$ 21.000,15** | **R$ 0,00** | ✅ 100% Exato |

---

### Dia 02/07/2026 (Linha 4 da Planilha)

| Seção | Coluna Excel | Campo | Valor Planilha | Valor Sistema | Diferença | Status |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **Operações** | Col 2 | Pacotes | R$ 6.816,00 | R$ 6.816,00 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 3 | Passagens | R$ 536,13 | R$ 536,13 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 4 | Hotéis | R$ 829,37 | R$ 829,37 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 7 | Aluguel Carros | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 11 | **Subtotal Operações** | **R$ 8.181,50** | **R$ 8.181,50** | **R$ 0,00** | ✅ 100% Exato |
| **Vendas** | Col 17 | Atendimentos | 20 | 20 | 0 | ✅ 100% Exato |
| **Vendas** | Col 18 | Dinheiro | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 19 | Crediário | R$ 4.166,00 | R$ 3.061,00 | -R$ 1.105,00 | ⚠️ Divergência Classificatória |
| **Vendas** | Col 20 | Cartão Agência | R$ 0,00 | R$ 1.105,00 | +R$ 1.105,00 | ⚠️ Divergência Classificatória |
| **Vendas** | Col 21 | Cartão Fornecedor | R$ 536,13 | R$ 536,13 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 22 | PIX | R$ 3.479,37 | R$ 3.479,37 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 26 | **Subtotal Vendas** | **R$ 8.181,50** | **R$ 8.181,50** | **R$ 0,00** | ✅ 100% Exato |
| **Recebimentos** | Col 33 | Dinheiro | R$ 300,00 | R$ 300,00 | R$ 0,00 | ✅ 100% Exato |
| **Recebimentos** | Col 36 | PIX | R$ 1.300,00 | R$ 1.300,00 | R$ 0,00 | ✅ 100% Exato |
| **Recebimentos** | Col 38 | Boleto | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Recebimentos** | Col 41 | **Subtotal Recebimentos** | **R$ 1.600,00** | **R$ 1.600,00** | **R$ 0,00** | ✅ 100% Exato |
| **Gaveta/Caixa** | Col 44/46 | Saídas Pagamentos | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Gaveta/Caixa** | Col 48 | **Saldo Final Caixa** | **R$ 21.300,15** | **R$ 21.300,15** | **R$ 0,00** | ✅ 100% Exato |

---

### Dia 03/07/2026 (Linha 5 da Planilha)

| Seção | Coluna Excel | Campo | Valor Planilha | Valor Sistema | Diferença | Status |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **Operações** | Col 2 | Pacotes | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 3 | Passagens | R$ 1.102,96 | R$ 1.102,96 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 4 | Hotéis | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 7 | Aluguel Carros | R$ 902,97 | R$ 902,97 | R$ 0,00 | ✅ 100% Exato |
| **Operações** | Col 11 | **Subtotal Operações** | **R$ 2.005,93** | **R$ 2.005,93** | **R$ 0,00** | ✅ 100% Exato |
| **Vendas** | Col 17 | Atendimentos | 2 | 2 | 0 | ✅ 100% Exato |
| **Vendas** | Col 18 | Dinheiro | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 19 | Crediário | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 20 | Cartão Agência | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 21 | Cartão Fornecedor | R$ 2.005,93 | R$ 2.005,93 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 22 | PIX | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Vendas** | Col 26 | **Subtotal Vendas** | **R$ 2.005,93** | **R$ 2.005,93** | **R$ 0,00** | ✅ 100% Exato |
| **Recebimentos** | Col 33 | Dinheiro | R$ 1.664,00 | R$ 1.664,00 | R$ 0,00 | ✅ 100% Exato |
| **Recebimentos** | Col 36 | PIX | R$ 1.116,00 | R$ 1.116,00 | R$ 0,00 | ✅ 100% Exato |
| **Recebimentos** | Col 38 | Boleto | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Recebimentos** | Col 41 | **Subtotal Recebimentos** | **R$ 2.780,00** | **R$ 2.780,00** | **R$ 0,00** | ✅ 100% Exato |
| **Gaveta/Caixa** | Col 44/46 | Saídas Pagamentos | R$ 0,00 | R$ 0,00 | R$ 0,00 | ✅ 100% Exato |
| **Gaveta/Caixa** | Col 48 | **Saldo Final Caixa** | **R$ 22.964,15** | **R$ 22.964,15** | **R$ 0,00** | ✅ 100% Exato |

---

## 3. Explicação Detalhada das Divergências Encontradas

### A Divergência do Dia 02/07/2026: Cartão (R$ 1.105,00) vs Crediário (R$ 4.166,00)

#### O que aconteceu na Planilha Manual:
No dia 02/07/2026 foram fechadas 19 vendas para a mesma excursão em grupo ("Excursão Pe. Adjaclécio"), totalizando R$ 6.816,00.
Ao preencher a planilha, a operadora somou:
- Vendas recebidas no PIX no próprio dia: **R$ 3.479,37** (coluna 22)
- Venda direta no cartão fornecedor (Passagem Azul): **R$ 536,13** (coluna 21)
- Subtotal À Vista registrado: **R$ 4.015,50** (`3479,37 + 536,13`)
- Todo o restante da excursão que não entrou em conta no dia 02/07 foi lançado de forma genérica como **"A PRAZO / CREDIÁRIO"**: **R$ 4.166,00** (colunas 14 e 19).

#### O que o Sistema Registrou com Base no Banco de Dados:
No banco de dados do Monde, das vendas da excursão:
1. **Venda #3590** (Cliente Lindalva da Silva Barros): R$ 621,00 foi paga com Cartão de Crédito na maquininha **Stone** (com vencimento/liquidação da parcela agendada para 13/08/2026).
2. **Venda #3597** (Cliente Rosineide da Silva Melo Santos): R$ 484,00 foi paga com Cartão de Crédito na maquininha **Stone** (com liquidação agendada para 07/08/2026).
3. **Demais Vendas a Prazo** (#3575, #3579, #3584, #3589, #3591, #3578, #3588, #3595, #3593): somam **R$ 3.061,00**.

#### Prova da Conciliação Matemática:
$$\text{Crediário Real (Promissórias/Futuros)} + \text{Cartão Stone} = 3.061,00 + 1.105,00 = \mathbf{4.166,00}$$

- Na planilha: A operadora agrupou tudo sob **Crediário** ($R\$\ 4.166,00$) e deixou Cartão zerado ($R\$\ 0,00$).
- No sistema: O sistema identificou com rigor analítico que $R\$\ 1.105,00$ foram passados no cartão de crédito Stone, e $R\$\ 3.061,00$ ficaram em crediário.
- **Subtotal de Vendas:** Em ambos os lugares é exatamente **R$ 8.181,50**. Não há 1 centavo de diferença no faturamento total!

---

## 4. Correções e Ajustes Implementados com Sucesso

1. **Vendas de Pessoa Jurídica Importadas do Dump (02/07):**
   - Importadas as vendas omitidas na carga inicial: Venda `#3571` (Hospedagem Município de Mirandiba - R$ 829,37) e Venda `#3573` (Passagem Flytour José Carlos dos Santos - R$ 536,13).
   - Com isso, o total de operações bateu exatos **R$ 8.181,50** e os atendimentos subiram para **20** (100% igual à planilha).

2. **Categorização de Produtos e Excursões:**
   - As 19 vendas do dia 02/07 foram vinculadas a **Pacotes** (R$ 6.816,00), incluindo pacotes espirituais com transporte, guia e hospedagem.
   - A venda `#3574` (Gustavo Conegundes - R$ 902,97) no dia 03/07, com localizador Rentcars `R1360528-25`, foi categorizada como **Aluguel (Carros)** (Coluna 7 do Excel).
   - A venda `#3576` (Rosilene Neusa - R$ 1.102,96) foi vinculada a **Passagens** (Coluna 3 do Excel).

3. **Vínculo Real de Recebimentos com Contas Bancárias e Caixa Físico (03/07):**
   - O título de R$ 1.000,00 da cliente Edjaria Wanessa (venda `#3024`), embora no cadastro estivesse anotado com método nominal "PIX/Depósito", gerou movimentação bancária direta na conta **Dinheiro (CAIXA)**.
   - O sistema agora verifica a movimentação bancária vinculada:
     - Títulos creditados na conta física `CAIXA`: R$ 1.000,00 + R$ 24,00 + R$ 400,00 + R$ 240,00 = **R$ 1.664,00** (Coluna 33 Dinheiro).
     - Títulos creditados na conta corrente `Banco do Brasil`: R$ 676,00 + R$ 440,00 = **R$ 1.116,00** (Coluna 36 PIX).
     - Total de Recebimentos: **R$ 2.780,00** (100% exato).
     - Saldo da Gaveta no dia 03/07: $21.300,15 + 1.664,00 = \mathbf{22.964,15}$ (100% exato).

4. **Saídas da Gaveta do Dia 01/07 (R$ 384,00):**
   - Identificadas as saídas reais de dinheiro da gaveta no dia 01/07:
     - R$ 110,00 (Presente Carina)
     - R$ 174,00 (Reunião Juazeiro)
     - R$ 100,00 (Transferência)
     - Total Saídas: **R$ 384,00** (fechando o Saldo da Gaveta em R$ 21.000,15, exatamente igual à Coluna 48 da planilha).

---

## 5. Conclusão

O sistema agora possui conciliação financeira automatizada de alta precisão:
- **01/07/2026:** 100% coincidente em todas as células.
- **02/07/2026:** 100% coincidente em subtotais, caixa, atendimentos, operações e recebimentos; a única diferença é a segregação de cartões Stone da maquininha versus crediário.
- **03/07/2026:** 100% coincidente em todas as células.
- **22/07/2026:** 100% coincidente (regressão testada e preservada).
