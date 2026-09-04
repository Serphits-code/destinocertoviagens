"use client";

import { Plus, Trash2 } from "lucide-react";
import type { EditorBlock, BlockData, RowStatus } from "@/lib/editor-types";

interface BlockTableProps {
  block: EditorBlock;
  onUpdate: (data: BlockData) => void;
}

const inputCls =
  "w-full px-2 py-1.5 rounded-md border border-transparent bg-transparent text-text-body text-sm focus:outline-none focus:border-primary focus:bg-surface transition-all";
const numCls = `${inputCls} text-right tabular-nums`;
const thCls = "px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide";
const tdCls = "px-2 py-1 border-t border-border-soft";

function StatusSelect({
  value,
  onChange,
}: {
  value: RowStatus;
  onChange: (v: RowStatus) => void;
}) {
  const styles: Record<RowStatus, string> = {
    PENDENTE: "bg-status-danger-bg text-status-danger",
    COTADO: "bg-status-info-bg text-status-info",
    CONFIRMADO: "bg-status-success-bg text-status-success",
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RowStatus)}
      className={`px-2 py-1 rounded-full text-xs font-semibold border-none outline-none cursor-pointer ${styles[value]}`}
    >
      <option value="PENDENTE">PENDENTE</option>
      <option value="COTADO">COTADO</option>
      <option value="CONFIRMADO">CONFIRMADO</option>
    </select>
  );
}

function DeleteRowBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded text-text-muted hover:text-status-danger hover:bg-status-danger-bg transition-colors"
      title="Remover linha"
    >
      <Trash2 size={14} />
    </button>
  );
}

export function BlockTable({ block, onUpdate }: BlockTableProps) {
  const d = block.data;

  const set = (key: string, value: unknown) => onUpdate({ ...d, [key]: value });

  const setRow = (listKey: string, idx: number, key: string, value: unknown) => {
    const list = [...(d[listKey] ?? [])];
    list[idx] = { ...list[idx], [key]: value };
    onUpdate({ ...d, [listKey]: list });
  };

  const addRow = (listKey: string, template: Record<string, unknown>) =>
    onUpdate({ ...d, [listKey]: [...(d[listKey] ?? []), template] });

  const removeRow = (listKey: string, idx: number) =>
    onUpdate({
      ...d,
      [listKey]: (d[listKey] ?? []).filter((_: unknown, i: number) => i !== idx),
    });

  switch (block.categoryId) {
    // ---- Itens Inclusos ----
    case "itens_inclusos":
      return (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left w-[25%]`}>Tipo de Item</th>
                <th className={`${thCls} text-left w-[35%]`}>Fornecedor / Descrição</th>
                <th className={`${thCls} text-right w-[18%]`}>Custo Estimado (R$)</th>
                <th className={`${thCls} text-center w-[16%]`}>Status</th>
                <th className="w-[6%]" />
              </tr>
            </thead>
            <tbody>
              {(d.rows ?? []).map(
                (
                  r: { type: string; icon: string; color: string; fornecedor: string; custo: string; status: RowStatus },
                  i: number
                ) => (
                  <tr key={i} style={{ borderLeft: `4px solid ${r.color || "#D97706"}` }}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-1.5">
                        <span>{r.icon || "📦"}</span>
                        <input className={inputCls} value={r.type} onChange={(e) => setRow("rows", i, "type", e.target.value)} />
                      </div>
                    </td>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.fornecedor} placeholder="Fornecedor..." onChange={(e) => setRow("rows", i, "fornecedor", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={numCls} value={r.custo} onChange={(e) => setRow("rows", i, "custo", e.target.value)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <StatusSelect value={r.status} onChange={(v) => setRow("rows", i, "status", v)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("rows", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() =>
              addRow("rows", { type: "Novo Item", icon: "📦", color: "#D97706", fornecedor: "", custo: "0.00", status: "PENDENTE" })
            }
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
          >
            <Plus size={14} /> Adicionar Item
          </button>
        </div>
      );

    // ---- Personalizados ----
    case "personalizados":
      return (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left w-[50%]`}>Nome do Item</th>
                <th className={`${thCls} text-right w-[22%]`}>Custo (R$)</th>
                <th className={`${thCls} text-right w-[22%]`}>Lucro (R$)</th>
                <th className="w-[6%]" />
              </tr>
            </thead>
            <tbody>
              {(d.rows ?? []).map(
                (r: { nome: string; custo: string; lucro: string }, i: number) => (
                  <tr key={i}>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.nome} placeholder="Nome do item..." onChange={(e) => setRow("rows", i, "nome", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={numCls} value={r.custo} onChange={(e) => setRow("rows", i, "custo", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={numCls} value={r.lucro} onChange={(e) => setRow("rows", i, "lucro", e.target.value)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("rows", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() => addRow("rows", { nome: "Novo Item", custo: "0.00", lucro: "0.00" })}
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
          >
            <Plus size={14} /> Adicionar Item
          </button>
        </div>
      );

    // ---- Aéreo ----
    case "aereo":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-muted">
              Portal
              <input className={inputCls} value={d.portal ?? ""} onChange={(e) => set("portal", e.target.value)} />
            </label>
            <label className="text-xs text-text-muted">
              Localizador
              <input className={inputCls} value={d.localizador ?? ""} onChange={(e) => set("localizador", e.target.value)} />
            </label>
            <label className="text-xs text-text-muted">
              Vagas
              <input className={inputCls} value={d.vagas ?? ""} onChange={(e) => set("vagas", e.target.value)} />
            </label>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Cia", "Voo", "Origem", "Saída", "Chegada", "Destino", "Tipo", "Status", ""].map((h) => (
                  <th key={h} className={`${thCls} text-left`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(d.flights ?? []).map(
                (
                  f: { cia: string; voo: string; origem: string; saida: string; chegada: string; destino: string; tipo: string; status: RowStatus },
                  i: number
                ) => (
                  <tr key={i}>
                    {(["cia", "voo", "origem", "saida", "chegada", "destino"] as const).map((k) => (
                      <td key={k} className={tdCls}>
                        <input className={inputCls} value={f[k]} onChange={(e) => setRow("flights", i, k, e.target.value)} />
                      </td>
                    ))}
                    <td className={tdCls}>
                      <input className={inputCls} value={f.tipo} onChange={(e) => setRow("flights", i, "tipo", e.target.value)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <StatusSelect value={f.status} onChange={(v) => setRow("flights", i, "status", v)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("flights", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() =>
              addRow("flights", { cia: "AZUL", voo: "", origem: "", saida: "", chegada: "", destino: "", tipo: "Ida", status: "CONFIRMADO" })
            }
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
          >
            <Plus size={14} /> Adicionar Voo
          </button>

          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-muted">
              Custo Unitário (R$)
              <input className={numCls} value={d.custoUnitario ?? ""} onChange={(e) => set("custoUnitario", e.target.value)} />
            </label>
            <label className="text-xs text-text-muted">
              Sinal (R$)
              <input className={numCls} value={d.sinal ?? ""} onChange={(e) => set("sinal", e.target.value)} />
            </label>
            <label className="text-xs text-text-muted">
              Observação
              <input className={inputCls} value={d.observation ?? ""} onChange={(e) => set("observation", e.target.value)} />
            </label>
          </div>
        </div>
      );

    // ---- Hospedagem ----
    case "hospedagem":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-muted">
              Hotel
              <input className={inputCls} value={d.hotel ?? ""} onChange={(e) => set("hotel", e.target.value)} />
            </label>
            <label className="text-xs text-text-muted">
              Cidade
              <input className={inputCls} value={d.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} />
            </label>
            <label className="text-xs text-text-muted">
              Diárias
              <input className={inputCls} value={d.diarias ?? ""} onChange={(e) => set("diarias", e.target.value)} />
            </label>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Tipo", "Diária (R$)", "Total Quarto", "Por Pessoa", "Qtd", "Total Período", ""].map((h) => (
                  <th key={h} className={`${thCls} text-left`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(d.rooms ?? []).map(
                (
                  r: { tipo: string; diaria: string; totalQuarto: string; porPessoa: string; qtd: string; totalPeriodo: string },
                  i: number
                ) => (
                  <tr key={i}>
                    {(["tipo", "diaria", "totalQuarto", "porPessoa", "qtd", "totalPeriodo"] as const).map((k) => (
                      <td key={k} className={tdCls}>
                        <input className={k === "tipo" ? inputCls : numCls} value={r[k]} onChange={(e) => setRow("rooms", i, k, e.target.value)} />
                      </td>
                    ))}
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("rooms", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() =>
              addRow("rooms", { tipo: "Duplo", diaria: "0.00", totalQuarto: "0.00", porPessoa: "0.00", qtd: "1", totalPeriodo: "0.00" })
            }
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
          >
            <Plus size={14} /> Adicionar Quarto
          </button>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-text-muted">
              Total Reserva (R$)
              <input className={numCls} value={d.totalReserva ?? ""} onChange={(e) => set("totalReserva", e.target.value)} />
            </label>
            <label className="text-xs text-text-muted">
              Observação
              <input className={inputCls} value={d.observation ?? ""} onChange={(e) => set("observation", e.target.value)} />
            </label>
          </div>
        </div>
      );

    // ---- Rodoviário ----
    case "rodoviario":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["empresa", "Empresa"],
                ["atendente", "Atendente"],
                ["veiculo", "Veículo"],
                ["vagas", "Vagas"],
                ["wifi", "Wi-Fi"],
                ["banheiro", "Banheiro"],
                ["ar", "Ar-condicionado"],
                ["agua", "Água"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs text-text-muted">
                {label}
                <input className={inputCls} value={d[key] ?? ""} onChange={(e) => set(key, e.target.value)} />
              </label>
            ))}
          </div>
          <label className="block text-xs text-text-muted">
            Itinerário
            <input className={inputCls} value={d.itinerario ?? ""} onChange={(e) => set("itinerario", e.target.value)} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-muted">
              Valor Contrato (R$)
              <input className={numCls} value={d.valorContrato ?? ""} onChange={(e) => set("valorContrato", e.target.value)} />
            </label>
            <label className="text-xs text-text-muted">
              Rateio por Pessoa (R$)
              <input className={numCls} value={d.rateioPorPessoa ?? ""} onChange={(e) => set("rateioPorPessoa", e.target.value)} />
            </label>
            <label className="text-xs text-text-muted">
              Status
              <div className="mt-1">
                <StatusSelect value={(d.status as RowStatus) ?? "COTADO"} onChange={(v) => set("status", v)} />
              </div>
            </label>
          </div>
          <label className="block text-xs text-text-muted">
            Observação
            <input className={inputCls} value={d.observation ?? ""} onChange={(e) => set("observation", e.target.value)} />
          </label>
        </div>
      );

    // ---- Guias ----
    case "guias":
      return (
        <div className="space-y-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Nome", "Tipo", "Telefone", "Diárias", "Valor Total (R$)", "Status", ""].map((h) => (
                  <th key={h} className={`${thCls} text-left`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(d.guias ?? []).map(
                (
                  g: { nome: string; tipo: string; telefone: string; diarias: string; valorTotal: string; status: RowStatus },
                  i: number
                ) => (
                  <tr key={i}>
                    {(["nome", "tipo", "telefone", "diarias"] as const).map((k) => (
                      <td key={k} className={tdCls}>
                        <input className={inputCls} value={g[k]} onChange={(e) => setRow("guias", i, k, e.target.value)} />
                      </td>
                    ))}
                    <td className={tdCls}>
                      <input className={numCls} value={g.valorTotal} onChange={(e) => setRow("guias", i, "valorTotal", e.target.value)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <StatusSelect value={g.status} onChange={(v) => setRow("guias", i, "status", v)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("guias", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() =>
              addRow("guias", { nome: "", tipo: "Acompanhante", telefone: "", diarias: "1", valorTotal: "0.00", status: "PENDENTE" })
            }
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
          >
            <Plus size={14} /> Adicionar Guia
          </button>

          <div>
            <p className="text-xs text-text-muted mb-1">Rateio por Pessoa (R$)</p>
            <input className={`${numCls} max-w-40`} value={d.rateioPorPessoa ?? ""} onChange={(e) => set("rateioPorPessoa", e.target.value)} />
          </div>

          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Roteiro</p>
            <table className="w-full text-sm">
              <tbody>
                {(d.roteiro ?? []).map(
                  (r: { horario: string; atividade: string; status: RowStatus }, i: number) => (
                    <tr key={i}>
                      <td className={tdCls} style={{ width: "90px" }}>
                        <input className={inputCls} value={r.horario} onChange={(e) => setRow("roteiro", i, "horario", e.target.value)} />
                      </td>
                      <td className={tdCls}>
                        <input className={inputCls} value={r.atividade} onChange={(e) => setRow("roteiro", i, "atividade", e.target.value)} />
                      </td>
                      <td className={`${tdCls} text-center`} style={{ width: "130px" }}>
                        <StatusSelect value={r.status} onChange={(v) => setRow("roteiro", i, "status", v)} />
                      </td>
                      <td className={`${tdCls} text-center`} style={{ width: "40px" }}>
                        <DeleteRowBtn onClick={() => removeRow("roteiro", i)} />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
            <button
              onClick={() => addRow("roteiro", { horario: "00:00", atividade: "Nova Atividade", status: "CONFIRMADO" })}
              className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
            >
              <Plus size={14} /> Adicionar Horário
            </button>
          </div>
        </div>
      );

    // ---- Serviços Inclusos (Duplo/Triplo) ----
    case "servicos_inclusos": {
      const extraCols: string[] = d.extraColumns ?? [];
      const rows: { servico: string; [k: string]: string }[] = d.rows ?? [];
      const summaryRows: { label: string; [k: string]: string }[] = d.summaryRows ?? [];
      const valueKeys = ["duplo", "triplo", ...extraCols.map((_, i) => `extra_${i}`)];
      const headers = ["DUPLO", "TRIPLO", ...extraCols];

      return (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left`}>Serviço</th>
                {headers.map((h, hi) => (
                  <th key={hi} className={`${thCls} text-right`}>
                    {hi < 2 ? (
                      h
                    ) : (
                      <input
                        className={`${inputCls} text-right uppercase text-xs`}
                        value={h}
                        placeholder={`Coluna ${hi + 1}`}
                        onChange={(e) => {
                          const next = [...extraCols];
                          next[hi - 2] = e.target.value;
                          set("extraColumns", next);
                        }}
                      />
                    )}
                  </th>
                ))}
                <th className="w-[6%]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className={tdCls}>
                    <input className={inputCls} value={r.servico} onChange={(e) => setRow("rows", i, "servico", e.target.value)} />
                  </td>
                  {valueKeys.map((k) => (
                    <td key={k} className={tdCls}>
                      <input className={numCls} value={r[k] ?? ""} onChange={(e) => setRow("rows", i, k, e.target.value)} />
                    </td>
                  ))}
                  <td className={`${tdCls} text-center`}>
                    <DeleteRowBtn onClick={() => removeRow("rows", i)} />
                  </td>
                </tr>
              ))}
              {/* Linhas de totalização */}
              {summaryRows.map((r, i) => (
                <tr key={`sum-${i}`} className="bg-surface-subtle font-semibold">
                  <td className={tdCls}>
                    <input className={`${inputCls} font-semibold`} value={r.label} onChange={(e) => setRow("summaryRows", i, "label", e.target.value)} />
                  </td>
                  {valueKeys.map((k) => (
                    <td key={k} className={tdCls}>
                      <input className={`${numCls} font-semibold`} value={r[k] ?? ""} onChange={(e) => setRow("summaryRows", i, k, e.target.value)} />
                    </td>
                  ))}
                  <td className={`${tdCls} text-center`}>
                    <DeleteRowBtn onClick={() => removeRow("summaryRows", i)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => addRow("rows", { servico: "Novo Serviço", duplo: "0.00", triplo: "0.00" })}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
            >
              <Plus size={14} /> Adicionar Serviço
            </button>
            <button
              onClick={() => addRow("summaryRows", { label: "Nova Linha", duplo: "0.00", triplo: "0.00" })}
              className="flex items-center gap-1.5 text-sm text-tertiary hover:text-primary font-medium transition-colors"
            >
              <Plus size={14} /> Adicionar Totalizador
            </button>
            <button
              onClick={() => set("extraColumns", [...extraCols, `QUÁDRUPLO`])}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary font-medium transition-colors"
            >
              <Plus size={14} /> Adicionar Coluna
            </button>
          </div>
        </div>
      );
    }

    // ---- Tabela para Crianças ----
    case "criancas":
      return (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left w-[15%]`}>Idade</th>
                <th className={`${thCls} text-left w-[45%]`}>Inclusos</th>
                <th className={`${thCls} text-right w-[18%]`}>Valor à vista</th>
                <th className={`${thCls} text-right w-[18%]`}>Valor a prazo</th>
                <th className="w-[4%]" />
              </tr>
            </thead>
            <tbody>
              {(d.rows ?? []).map(
                (r: { idade: string; inclusos: string; valor: string; valor2: string }, i: number) => (
                  <tr key={i}>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.idade} onChange={(e) => setRow("rows", i, "idade", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.inclusos} onChange={(e) => setRow("rows", i, "inclusos", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={numCls} value={r.valor} onChange={(e) => setRow("rows", i, "valor", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={numCls} value={r.valor2} onChange={(e) => setRow("rows", i, "valor2", e.target.value)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("rows", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() => addRow("rows", { idade: "", inclusos: "", valor: "0.00", valor2: "0.00" })}
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
          >
            <Plus size={14} /> Adicionar Faixa Etária
          </button>
        </div>
      );

    // ---- Roteiro por Dias ----
    case "roteiro_dias":
      return (
        <div className="space-y-2">
          {(d.days ?? []).map((day: { dia: string; descricao: string }, i: number) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface-subtle">
              <input
                className="w-20 shrink-0 px-2 py-1.5 rounded-md bg-surface border border-border text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                value={day.dia}
                onChange={(e) => setRow("days", i, "dia", e.target.value)}
              />
              <textarea
                className="flex-1 px-2 py-1.5 rounded-md border border-transparent bg-transparent text-text-body text-sm focus:outline-none focus:border-primary focus:bg-surface transition-all resize-none"
                rows={2}
                value={day.descricao}
                placeholder="Atividades do dia..."
                onChange={(e) => setRow("days", i, "descricao", e.target.value)}
              />
              <DeleteRowBtn onClick={() => removeRow("days", i)} />
            </div>
          ))}
          <button
            onClick={() => addRow("days", { dia: `DIA ${(d.days?.length ?? 0) + 1}`, descricao: "" })}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
          >
            <Plus size={14} /> Adicionar Dia
          </button>
        </div>
      );

    // ---- Tabela Customizada ----
    case "personalizada":
    default:
      return (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left w-[35%]`}>Item</th>
                <th className={`${thCls} text-left w-[30%]`}>Fornecedor</th>
                <th className={`${thCls} text-right w-[20%]`}>Valor (R$)</th>
                <th className={`${thCls} text-center w-[15%]`}>Status</th>
                <th className="w-[6%]" />
              </tr>
            </thead>
            <tbody>
              {(d.rows ?? []).map(
                (
                  r: { item: string; fornecedor: string; valor: string; status: RowStatus },
                  i: number
                ) => (
                  <tr key={i}>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.item} onChange={(e) => setRow("rows", i, "item", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={inputCls} value={r.fornecedor} onChange={(e) => setRow("rows", i, "fornecedor", e.target.value)} />
                    </td>
                    <td className={tdCls}>
                      <input className={numCls} value={r.valor} onChange={(e) => setRow("rows", i, "valor", e.target.value)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <StatusSelect value={r.status ?? "CONFIRMADO"} onChange={(v) => setRow("rows", i, "status", v)} />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <DeleteRowBtn onClick={() => removeRow("rows", i)} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button
            onClick={() => addRow("rows", { item: "Novo Item", fornecedor: "", valor: "0.00", status: "PENDENTE" })}
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors"
          >
            <Plus size={14} /> Adicionar Linha
          </button>
        </div>
      );
  }
}
