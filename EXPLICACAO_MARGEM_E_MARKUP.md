# Guia Financeiro: Margem Líquida vs. Markup sobre o Custo

Este documento explica de forma prática e detalhada a metodologia de cálculo das métricas de rentabilidade utilizadas no sistema **Destino Certo Viagens**, utilizando como estudo de caso real a excursão **Balneário Camboriú & Blumenau (Outubro/2026)**.

---

## 1. Os Três Pilares Financeiros da Viagem

Para entender qualquer métrica de lucratividade, consideramos sempre três valores fundamentais:

| Métrica | Valor Real no Sistema | O que representa |
| :--- | :--- | :--- |
| **Faturamento Bruto (Receita Total)** | **R$ 158.688,81** | Total cobrado de todos os passageiros confirmados (53 pessoas). |
| **Custos Operacionais Totais** | **R$ 119.240,68** | Total pago aos fornecedores (hotéis, transporte rodoviário, passeios, guias, etc.). |
| **Lucro Líquido Projetado** | **R$ 39.448,13** | O saldo que sobra livre para a agência após pagar 100% dos fornecedores. |
| **Lucro Médio por Passageiro** | **R$ 744,30** | Lucro Líquido (R$ 39.448,13) ÷ 53 passageiros. |

$$\text{Lucro Líquido} = \text{Faturamento Bruto} - \text{Custos Operacionais}$$
$$\text{R\$ } 158.688,81 - \text{R\$ } 119.240,68 = \mathbf{\text{R\$ } 39.448,13}$$

---

## 2. O que é a Margem Líquida (24.9%)?

A **Margem Líquida** mede o percentual de lucro em relação ao **Preço de Venda (Faturamento)**.

> **Pergunta que ela responde:**  
> *"De cada R$ 100,00 que entram na conta da agência, quantos reais sobram limpos como lucro?"*

### Fórmula:
$$\text{Margem Líquida (\%)} = \left( \frac{\text{Lucro Líquido}}{\text{Faturamento Bruto}} \right) \times 100$$

### Aplicação com os valores reais:
$$\text{Margem Líquida} = \left( \frac{\text{R\$ } 39.448,13}{\text{R\$ } 158.688,81} \right) \times 100 = 0,248588 \times 100 = \mathbf{24,9\%}$$

### Interpretação prática:
- Para cada **R$ 100,00** pagos pelos passageiros:
  - **R$ 24,90** é o lucro líquido que fica no bolso da agência.
  - **R$ 75,10** é utilizado para pagar as despesas operacionais da viagem.

---

## 3. O que é o Markup sobre o Custo (+33.1%)?

> **Atenção:** No meio contábil e financeiro, a expressão **"Markup s/ Custo"** significa **"Markup SOBRE o Custo"** (e não "sem custo").

O **Markup** mede a taxa de acréscimo aplicada **em cima do que a viagem custa** com fornecedores para gerar o preço final.

> **Pergunta que ele responde:**  
> *"Quantos por cento eu adicionei em cima do custo do fornecedor para formar o preço de venda da viagem?"*

### Fórmula:
$$\text{Markup sobre o Custo (\%)} = \left( \frac{\text{Lucro Líquido}}{\text{Custo Operacional Total}} \right) \times 100$$

### Aplicação com os valores reais:
$$\text{Markup sobre o Custo} = \left( \frac{\text{R\$ } 39.448,13}{\text{R\$ } 119.240,68} \right) \times 100 = 0,330827 \times 100 = \mathbf{+33,1\%}$$

### Prova Real (Validação do Preço de Venda):
Multiplicando o custo pelo fator de markup $(1 + 0,330827)$:
$$\text{R\$ } 119.240,68 \times 1,330827 = \mathbf{\text{R\$ } 158.688,81} \text{ (Faturamento exato)}$$

### Interpretação prática:
- Para cada **R$ 100,00** que a agência gasta contratando fornecedores, ela adiciona **R$ 33,10 de acréscimo**, vendendo o pacote por **R$ 133,10**.

---

## 4. Comparativo Direto: Margem vs. Markup

Embora os dois números reflitam a mesma rentabilidade da viagem, eles usam bases matemáticas diferentes:

| Característica | Margem Líquida | Markup sobre o Custo |
| :--- | :--- | :--- |
| **Valor na viagem** | **24.9%** | **+33.1%** |
| **Base do cálculo** | Preço de Venda (Faturamento) | Custo do Fornecedor |
| **Ponto de vista** | Olhando o dinheiro que **entra** | Olhando o dinheiro que **sai** |
| **Utilidade gerencial** | Medir a rentabilidade final no DRE | Saber quanto acrescentar no orçamento |
| **Limite máximo** | Nunca passa de 100% | Pode ser superior a 100%, 200%, etc. |

---

## 5. Como Converter entre Margem e Markup

Para precificar pacotes com rapidez no dia a dia:

### Para converter Margem em Markup:
$$\text{Markup} = \frac{\text{Margem}}{1 - \text{Margem}}$$

*Exemplo:* Para ter uma margem de **24,86%** $(0,2486)$:
$$\text{Markup} = \frac{0,2486}{1 - 0,2486} = \frac{0,2486}{0,7514} = \mathbf{33,1\%}$$

---

### Para converter Markup em Margem:
$$\text{Margem} = \frac{\text{Markup}}{1 + \text{Markup}}$$

*Exemplo:* Se você aplicou um markup de **33,1%** $(0,331)$:
$$\text{Margem} = \frac{0,331}{1 + 0,331} = \frac{0,331}{1,331} = \mathbf{24,9\%}$$

---

## 6. Onde esses valores aparecem no sistema?

No painel de viagens em `Excursões > [Viagem] > Financeiro`:
1. Na aba **"Destrinchamento do Lucro"** (ao lado de Faturamento).
2. No card lateral **"Saúde do Lucro & Margens"**:
   - **Margem:** Exibida no badge superior direito (`24.9% Margem`).
   - **Markup:** Exibido no card inferior esquerdo com o rótulo expandido **`Markup sobre o custo: +33.1%`**.
   - **Faturamento:** Exibido no card inferior direito (`R$ 158.688,81`).
   - **Lucro Líquido:** Exibido no destaque central (`R$ 39.448,13`).
