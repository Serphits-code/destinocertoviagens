"use client";

import { Plus, Trash2, Plane, DollarSign, Calendar } from "lucide-react";
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

function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const n = parseFloat(String(val).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function toInputDate(val: unknown): string {
  if (!val || typeof val !== "string") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return "";
}

function BlockObservation({
  value,
  onChange,
  placeholder = "Observações...",
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-4 pt-3 border-t border-border/40">
      <label className="block text-xs text-text-muted">
        <span className="block mb-1 font-medium text-text-title">Observação</span>
        <input
          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
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
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Item
          </button>
          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre itens inclusos..."
          />
        </div>
      );

    // ---- Personalizados ----
    case "personalizados": {
      const vagasNum = parseNum(d.vagas) || 20;

      const handleVagasChange = (newVagas: string) => {
        const vNum = parseNum(newVagas) || 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (d.rows ?? []).map((r: any) => {
          const unit = parseNum(r.valor ?? r.custo);
          return {
            ...r,
            total: unit > 0 ? (unit * vNum).toFixed(2) : r.total,
          };
        });

        let totalGeral = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const r of rows) {
          totalGeral += parseNum(r.total ?? (parseNum(r.valor ?? r.custo) * vNum));
        }

        onUpdate({
          ...d,
          vagas: newVagas,
          rows,
          totalDespesas: totalGeral.toFixed(2),
        });
      };

      const handleRowValorChange = (idx: number, newVal: string) => {
        const rows = [...(d.rows ?? [])];
        const vNum = parseNum(newVal);
        const total = vNum > 0 ? (vNum * vagasNum).toFixed(2) : (newVal ? "0.00" : "");
        rows[idx] = {
          ...rows[idx],
          valor: newVal,
          custo: newVal,
          total,
        };

        let totalGeral = 0;
        for (const r of rows) {
          totalGeral += parseNum(r.total);
        }

        onUpdate({
          ...d,
          rows,
          totalDespesas: totalGeral.toFixed(2),
        });
      };

      const handleRowTotalChange = (idx: number, newTotal: string) => {
        const rows = [...(d.rows ?? [])];
        const tNum = parseNum(newTotal);
        const unit = vagasNum > 0 && tNum > 0 ? (tNum / vagasNum).toFixed(2) : rows[idx].valor;
        rows[idx] = {
          ...rows[idx],
          total: newTotal,
          valor: unit,
          custo: unit,
        };

        let totalGeral = 0;
        for (const r of rows) {
          totalGeral += parseNum(r.total);
        }

        onUpdate({
          ...d,
          rows,
          totalDespesas: totalGeral.toFixed(2),
        });
      };

      const handleAddRow = () => {
        const newRow = { nome: "Nova Despesa", valor: "0.00", custo: "0.00", total: "0.00" };
        const rows = [...(d.rows ?? []), newRow];
        onUpdate({ ...d, rows });
      };

      const handleRemoveRow = (idx: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (d.rows ?? []).filter((_: any, i: number) => i !== idx);
        let totalGeral = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const r of rows) {
          totalGeral += parseNum(r.total ?? (parseNum(r.valor ?? r.custo) * vagasNum));
        }
        onUpdate({
          ...d,
          rows,
          totalDespesas: totalGeral.toFixed(2),
        });
      };

      let totalGeralCalc = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of d.rows ?? []) {
        totalGeralCalc += parseNum(
          r.total !== undefined && r.total !== "" ? r.total : parseNum(r.valor ?? r.custo) * vagasNum
        );
      }

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <span className="text-xs text-text-muted">
              Preencha o valor unitário de cada despesa personalizada por passageiro.
            </span>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <span className="font-medium">Total de Vagas:</span>
              <input
                className="w-20 px-2.5 py-1 rounded-lg border border-border bg-surface text-text-body text-sm font-semibold text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.vagas ?? "20"}
                placeholder="20"
                onChange={(e) => handleVagasChange(e.target.value)}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={`${thCls} text-left w-[50%]`}>Nome do Item</th>
                  <th className={`${thCls} text-right w-[24%]`}>Valor Unitário (R$)</th>
                  <th className={`${thCls} text-right w-[20%]`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Valor Total (R$)</span>
                      <span className="text-[10px] text-text-muted font-normal">({vagasNum}x)</span>
                    </div>
                  </th>
                  <th className="w-[6%]" />
                </tr>
              </thead>
              <tbody>
                {(d.rows ?? []).map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (r: any, i: number) => {
                    const unitVal = r.valor ?? r.custo ?? "";
                    const totalVal =
                      r.total !== undefined && r.total !== ""
                        ? r.total
                        : parseNum(unitVal) > 0
                        ? (parseNum(unitVal) * vagasNum).toFixed(2)
                        : "";

                    return (
                      <tr key={i}>
                        <td className={tdCls}>
                          <input
                            className={inputCls}
                            value={r.nome ?? ""}
                            placeholder="Nome do item..."
                            onChange={(e) => setRow("rows", i, "nome", e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={numCls}
                            value={unitVal}
                            placeholder="0.00"
                            onChange={(e) => handleRowValorChange(i, e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={`${numCls} font-semibold text-primary`}
                            value={totalVal}
                            placeholder="0.00"
                            onChange={(e) => handleRowTotalChange(i, e.target.value)}
                          />
                        </td>
                        <td className={`${tdCls} text-center`}>
                          <DeleteRowBtn onClick={() => handleRemoveRow(i)} />
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleAddRow}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Item
          </button>

          {/* Valor total no fim do card */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-subtle/50">
            <span className="text-xs font-semibold text-text-title uppercase tracking-wide">
              Valor Total de Despesas Personalizadas
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-medium">({vagasNum} vagas):</span>
              <span className="text-base font-bold text-primary tabular-nums">
                R$ {totalGeralCalc.toFixed(2)}
              </span>
            </div>
          </div>

          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre itens personalizados..."
          />
        </div>
      );
    }

    // ---- Aéreo ----
    case "aereo": {
      const vagasNum = parseNum(d.vagas);

      const custoTotalDisplay =
        d.custoTotal !== undefined && d.custoTotal !== ""
          ? d.custoTotal
          : vagasNum > 0 && parseNum(d.custoUnitario) > 0
          ? (parseNum(d.custoUnitario) * vagasNum).toFixed(2)
          : "";

      const sinalUnitarioDisplay =
        d.sinalUnitario !== undefined && d.sinalUnitario !== ""
          ? d.sinalUnitario
          : vagasNum > 0 && parseNum(d.sinal) > 0
          ? (parseNum(d.sinal) / vagasNum).toFixed(2)
          : "";

      const sinalTotalDisplay =
        d.sinalTotal !== undefined && d.sinalTotal !== ""
          ? d.sinalTotal
          : d.sinal !== undefined && d.sinal !== ""
          ? d.sinal
          : vagasNum > 0 && parseNum(d.sinalUnitario) > 0
          ? (parseNum(d.sinalUnitario) * vagasNum).toFixed(2)
          : "";

      const valorNetUnitarioDisplay =
        d.valorNetUnitario !== undefined
          ? d.valorNetUnitario
          : d.valorNet && vagasNum > 0
          ? (parseNum(d.valorNet) / vagasNum).toFixed(2)
          : "";

      const valorNetTotalDisplay =
        d.valorNetTotal !== undefined
          ? d.valorNetTotal
          : d.valorNet !== undefined && d.valorNet !== ""
          ? d.valorNet
          : vagasNum > 0 && parseNum(d.valorNetUnitario) > 0
          ? (parseNum(d.valorNetUnitario) * vagasNum).toFixed(2)
          : "";

      const handleVagasChange = (newVagas: string) => {
        const vNum = parseNum(newVagas);
        const unitPassagem = parseNum(d.custoUnitario);
        const currentUnitSinal = parseNum(
          d.sinalUnitario !== undefined && d.sinalUnitario !== ""
            ? d.sinalUnitario
            : d.sinal && parseNum(d.vagas) > 0
            ? parseNum(d.sinal) / parseNum(d.vagas)
            : 0
        );
        const currentUnitNet = parseNum(
          d.valorNetUnitario !== undefined && d.valorNetUnitario !== ""
            ? d.valorNetUnitario
            : d.valorNet && parseNum(d.vagas) > 0
            ? parseNum(d.valorNet) / parseNum(d.vagas)
            : 0
        );

        const updated: Record<string, unknown> = {
          ...d,
          vagas: newVagas,
        };

        if (unitPassagem > 0 && vNum > 0) {
          updated.custoTotal = (unitPassagem * vNum).toFixed(2);
        }
        if (currentUnitSinal > 0 && vNum > 0) {
          const st = (currentUnitSinal * vNum).toFixed(2);
          updated.sinalTotal = st;
          updated.sinal = st;
          if (!d.sinalUnitario) {
            updated.sinalUnitario = currentUnitSinal.toFixed(2);
          }
        }
        if (currentUnitNet > 0 && vNum > 0) {
          const nt = (currentUnitNet * vNum).toFixed(2);
          updated.valorNetTotal = nt;
          updated.valorNet = nt;
          if (!d.valorNetUnitario) {
            updated.valorNetUnitario = currentUnitNet.toFixed(2);
          }
        }
        onUpdate(updated);
      };

      const handleUnitPassagemChange = (val: string) => {
        const u = parseNum(val);
        const vNum = parseNum(d.vagas);
        const total = vNum > 0 && u > 0 ? (u * vNum).toFixed(2) : (vNum > 0 && !val ? "" : d.custoTotal);
        onUpdate({
          ...d,
          custoUnitario: val,
          custoTotal: total,
        });
      };

      const handleTotalPassagemChange = (val: string) => {
        const t = parseNum(val);
        const vNum = parseNum(d.vagas);
        const unit = vNum > 0 && t > 0 ? (t / vNum).toFixed(2) : d.custoUnitario;
        onUpdate({
          ...d,
          custoTotal: val,
          custoUnitario: unit,
        });
      };

      const handleUnitValorNetChange = (val: string) => {
        const u = parseNum(val);
        const vNum = parseNum(d.vagas);
        const total = vNum > 0 && u > 0 ? (u * vNum).toFixed(2) : (vNum > 0 && !val ? "" : (d.valorNetTotal ?? d.valorNet));
        onUpdate({
          ...d,
          valorNetUnitario: val,
          valorNetTotal: total,
          valorNet: total,
        });
      };

      const handleTotalValorNetChange = (val: string) => {
        const t = parseNum(val);
        const vNum = parseNum(d.vagas);
        const unit = vNum > 0 && t > 0 ? (t / vNum).toFixed(2) : d.valorNetUnitario;
        onUpdate({
          ...d,
          valorNetTotal: val,
          valorNet: val,
          valorNetUnitario: unit,
        });
      };

      const handleUnitSinalChange = (val: string) => {
        const u = parseNum(val);
        const vNum = parseNum(d.vagas);
        const total = vNum > 0 && u > 0 ? (u * vNum).toFixed(2) : (vNum > 0 && !val ? "" : (d.sinalTotal ?? d.sinal));
        onUpdate({
          ...d,
          sinalUnitario: val,
          sinalTotal: total,
          sinal: total,
        });
      };

      const handleTotalSinalChange = (val: string) => {
        const t = parseNum(val);
        const vNum = parseNum(d.vagas);
        const unit = vNum > 0 && t > 0 ? (t / vNum).toFixed(2) : d.sinalUnitario;
        onUpdate({
          ...d,
          sinalTotal: val,
          sinal: val,
          sinalUnitario: unit,
        });
      };

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Portal</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.portal ?? ""}
                placeholder="Ex: SAKURA, Discovery"
                onChange={(e) => set("portal", e.target.value)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Localizador</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm uppercase font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.localizador ?? ""}
                placeholder="Ex: GRP832582"
                onChange={(e) => set("localizador", e.target.value.toUpperCase())}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Vagas</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.vagas ?? ""}
                placeholder="Ex: 20"
                onChange={(e) => handleVagasChange(e.target.value)}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
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
          </div>
          <button
            onClick={() =>
              addRow("flights", { cia: "AZUL", voo: "", origem: "", saida: "", chegada: "", destino: "", tipo: "Ida", status: "CONFIRMADO" })
            }
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Voo
          </button>

          {/* Valores das Passagens, Valor NET e Sinal com cálculo por vagas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-3.5 rounded-xl border border-border bg-surface-subtle/50">
            {/* Bloco Passagens */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <Plane size={14} className="text-primary" />
                <span>Valor das Passagens</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">Unitário (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0.00"
                    value={d.custoUnitario ?? ""}
                    onChange={(e) => handleUnitPassagemChange(e.target.value)}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0.00"
                    value={custoTotalDisplay}
                    onChange={(e) => handleTotalPassagemChange(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* Bloco Valor NET */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-emerald-500" />
                <span>Valor NET (Custo Líquido)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">NET Unitário (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0.00"
                    value={valorNetUnitarioDisplay}
                    onChange={(e) => handleUnitValorNetChange(e.target.value)}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">NET Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0.00"
                    value={valorNetTotalDisplay}
                    onChange={(e) => handleTotalValorNetChange(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* Bloco Sinal */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-amber-500" />
                <span>Sinal / Entrada</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  <span className="block mb-1 font-medium">Sinal Unit. (R$)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0.00"
                    value={sinalUnitarioDisplay}
                    onChange={(e) => handleUnitSinalChange(e.target.value)}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Sinal Total (R$)</span>
                    {vagasNum > 0 && (
                      <span className="text-[10px] text-text-muted font-normal">
                        ({vagasNum}v)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-text-title focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0.00"
                    value={sinalTotalDisplay}
                    onChange={(e) => handleTotalSinalChange(e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Prazos / Datas Limite */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-subtle/50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
              <Calendar size={14} className="text-primary" />
              <span>Prazos e Datas Limite</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-xs text-text-muted">
                <span className="block mb-1 font-medium">Prazo Pagamento do Sinal</span>
                <input
                  type="date"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  value={toInputDate(d.prazoSinal)}
                  onChange={(e) => set("prazoSinal", e.target.value)}
                />
              </label>
              <label className="text-xs text-text-muted">
                <span className="block mb-1 font-medium">Prazo Pagamento Total</span>
                <input
                  type="date"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  value={toInputDate(d.prazoPagamentoTotal)}
                  onChange={(e) => set("prazoPagamentoTotal", e.target.value)}
                />
              </label>
              <label className="text-xs text-text-muted">
                <span className="block mb-1 font-medium">Prazo Nomeação / Emissão</span>
                <input
                  type="date"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  value={toInputDate(d.prazoEmissao)}
                  onChange={(e) => set("prazoEmissao", e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted flex items-center justify-between">
              <span>Observações do Aéreo</span>
              <span className="text-[11px] font-normal text-text-muted">(regras de cancelamento, franquia de bagagem, RAV, etc.)</span>
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-y"
              placeholder="Ex: * Sem RAV. Franquia de 1 bagagem despachada 23kg por passageiro..."
              value={d.observation ?? ""}
              onChange={(e) => set("observation", e.target.value)}
            />
          </div>
        </div>
      );
    }

    // ---- Hospedagem ----
    case "hospedagem": {
      const getRoomCapacity = (tipo: string): number => {
        const lower = (tipo || "").trim().toLowerCase();
        if (lower.includes("single")) return 1;
        if (lower.includes("duplo")) return 2;
        if (lower.includes("triplo")) return 3;
        if (lower.includes("quadruplo") || lower.includes("quádruplo")) return 4;
        if (lower.includes("quintuplo") || lower.includes("quíntuplo")) return 5;
        return 2;
      };

      const handleDiariasChange = (newDiarias: string) => {
        const dNum = parseNum(newDiarias);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rooms = (d.rooms ?? []).map((r: any) => {
          const diariaNum = parseNum(r.diaria);
          if (diariaNum <= 0) return r;
          const effectiveDiarias = dNum > 0 ? dNum : 1;
          const totalQuarto = (diariaNum * effectiveDiarias).toFixed(2);
          const cap = getRoomCapacity(r.tipo);
          const porPessoa = (parseNum(totalQuarto) / cap).toFixed(2);
          const qtdNum = parseNum(r.qtd);
          const totalPeriodo =
            qtdNum > 0 && !String(r.totalPeriodo || "").toLowerCase().includes("cortesia")
              ? (parseNum(totalQuarto) * qtdNum).toFixed(2)
              : r.totalPeriodo;
          return {
            ...r,
            totalQuarto,
            porPessoa,
            totalPeriodo,
          };
        });

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        onUpdate({
          ...d,
          diarias: newDiarias,
          rooms,
          totalReserva: sumReserva > 0 ? sumReserva.toFixed(2) : d.totalReserva,
        });
      };

      const handleRoomTypeChange = (idx: number, newTipo: string) => {
        const rooms = [...(d.rooms ?? [])];
        const r = { ...rooms[idx], tipo: newTipo };
        const cap = getRoomCapacity(newTipo);
        const totalQuartoNum = parseNum(r.totalQuarto);
        const diariaNum = parseNum(r.diaria);
        const dNum = parseNum(d.diarias) || 1;

        if (totalQuartoNum > 0) {
          r.porPessoa = (totalQuartoNum / cap).toFixed(2);
        } else if (diariaNum > 0) {
          const tq = (diariaNum * dNum).toFixed(2);
          r.totalQuarto = tq;
          r.porPessoa = (parseNum(tq) / cap).toFixed(2);
        }
        rooms[idx] = r;
        onUpdate({ ...d, rooms });
      };

      const handleRoomDiariaChange = (idx: number, newDiaria: string) => {
        const rooms = [...(d.rooms ?? [])];
        const r = { ...rooms[idx], diaria: newDiaria };
        const diariaNum = parseNum(newDiaria);
        const dNum = parseNum(d.diarias) || 1;
        const cap = getRoomCapacity(r.tipo);

        if (diariaNum > 0) {
          const totalQuarto = (diariaNum * dNum).toFixed(2);
          r.totalQuarto = totalQuarto;
          r.porPessoa = (parseNum(totalQuarto) / cap).toFixed(2);
          const qtdNum = parseNum(r.qtd);
          if (qtdNum > 0 && !String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) {
            r.totalPeriodo = (parseNum(totalQuarto) * qtdNum).toFixed(2);
          }
        } else if (!newDiaria) {
          r.totalQuarto = "";
          r.porPessoa = "";
        }

        rooms[idx] = r;

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        onUpdate({
          ...d,
          rooms,
          totalReserva: sumReserva > 0 ? sumReserva.toFixed(2) : d.totalReserva,
        });
      };

      const handleRoomTotalQuartoChange = (idx: number, newTotalQuarto: string) => {
        const rooms = [...(d.rooms ?? [])];
        const r = { ...rooms[idx], totalQuarto: newTotalQuarto };
        const tNum = parseNum(newTotalQuarto);
        const cap = getRoomCapacity(r.tipo);
        const qtdNum = parseNum(r.qtd);

        if (tNum > 0) {
          r.porPessoa = (tNum / cap).toFixed(2);
          if (qtdNum > 0 && !String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) {
            r.totalPeriodo = (tNum * qtdNum).toFixed(2);
          }
        }

        rooms[idx] = r;

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        onUpdate({
          ...d,
          rooms,
          totalReserva: sumReserva > 0 ? sumReserva.toFixed(2) : d.totalReserva,
        });
      };

      const handleRoomQtdChange = (idx: number, newQtd: string) => {
        const rooms = [...(d.rooms ?? [])];
        const r = { ...rooms[idx], qtd: newQtd };
        const qtdNum = parseNum(newQtd);
        const totalQuartoNum = parseNum(r.totalQuarto);

        if (qtdNum > 0 && totalQuartoNum > 0 && !String(r.totalPeriodo || "").toLowerCase().includes("cortesia")) {
          r.totalPeriodo = (totalQuartoNum * qtdNum).toFixed(2);
        }

        rooms[idx] = r;

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        onUpdate({
          ...d,
          rooms,
          totalReserva: sumReserva > 0 ? sumReserva.toFixed(2) : d.totalReserva,
        });
      };

      const handleRoomTotalPeriodoChange = (idx: number, newTotalPeriodo: string) => {
        const rooms = [...(d.rooms ?? [])];
        rooms[idx] = { ...rooms[idx], totalPeriodo: newTotalPeriodo };

        let sumReserva = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rm of rooms) {
          sumReserva += parseNum(rm.totalPeriodo);
        }

        onUpdate({
          ...d,
          rooms,
          totalReserva: sumReserva > 0 ? sumReserva.toFixed(2) : d.totalReserva,
        });
      };

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Hotel / Pousada</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.hotel ?? ""}
                placeholder="Ex: Tarobá Hotel, Pousada Alvorada"
                onChange={(e) => set("hotel", e.target.value)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Cidade</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.cidade ?? ""}
                placeholder="Ex: Foz do Iguaçu, Noronha"
                onChange={(e) => set("cidade", e.target.value)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Diárias</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.diarias ?? ""}
                placeholder="Ex: 3"
                onChange={(e) => handleDiariasChange(e.target.value)}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
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
                  ) => {
                    const normalizedTipo =
                      ["single", "duplo", "triplo", "quádruplo", "quadruplo"].includes(String(r.tipo || "").toLowerCase())
                        ? (r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1).toLowerCase()).replace(/quadruplo/i, "Quádruplo")
                        : r.tipo || "Duplo";

                    return (
                      <tr key={i}>
                        <td className={tdCls}>
                          <select
                            value={normalizedTipo}
                            onChange={(e) => handleRoomTypeChange(i, e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-all"
                          >
                            <option value="Single">Single (1 pessoa)</option>
                            <option value="Duplo">Duplo (2 pessoas)</option>
                            <option value="Triplo">Triplo (3 pessoas)</option>
                            <option value="Quádruplo">Quádruplo (4 pessoas)</option>
                            {!["Single", "Duplo", "Triplo", "Quádruplo"].includes(normalizedTipo) && normalizedTipo && (
                              <option value={normalizedTipo}>{normalizedTipo}</option>
                            )}
                          </select>
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.diaria ?? ""}
                            placeholder="0.00"
                            onChange={(e) => handleRoomDiariaChange(i, e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.totalQuarto ?? ""}
                            placeholder="0.00"
                            onChange={(e) => handleRoomTotalQuartoChange(i, e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.porPessoa ?? ""}
                            placeholder="0.00"
                            onChange={(e) => setRow("rooms", i, "porPessoa", e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.qtd ?? ""}
                            placeholder="1"
                            onChange={(e) => handleRoomQtdChange(i, e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            value={r.totalPeriodo ?? ""}
                            placeholder="0.00"
                            onChange={(e) => handleRoomTotalPeriodoChange(i, e.target.value)}
                          />
                        </td>
                        <td className={`${tdCls} text-center`}>
                          <DeleteRowBtn onClick={() => removeRow("rooms", i)} />
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => {
              addRow("rooms", {
                tipo: "Duplo",
                diaria: "0.00",
                totalQuarto: "0.00",
                porPessoa: "0.00",
                qtd: "1",
                totalPeriodo: "0.00",
              });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Quarto
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Total Reserva (R$)</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.totalReserva ?? ""}
                placeholder="0.00"
                onChange={(e) => set("totalReserva", e.target.value)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Observação</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.observation ?? ""}
                placeholder="Ex: Cortesia concedida no quarto duplo solteiro..."
                onChange={(e) => set("observation", e.target.value)}
              />
            </label>
          </div>
        </div>
      );
    }

    // ---- Rodoviário ----
    case "rodoviario": {
      const handleVagasChange = (newVagas: string) => {
        const vagasNum = parseNum(newVagas);
        const vContrato = parseNum(d.valorContrato);
        const rateio = vagasNum > 0 && vContrato > 0 ? (vContrato / vagasNum).toFixed(2) : d.rateioPorPessoa;
        onUpdate({
          ...d,
          vagas: newVagas,
          ...(rateio ? { rateioPorPessoa: rateio } : {}),
        });
      };

      const handleValorContratoChange = (newVal: string) => {
        const vNum = parseNum(newVal);
        const vagasNum = parseNum(d.vagas);
        const rateio = vagasNum > 0 && vNum > 0 ? (vNum / vagasNum).toFixed(2) : d.rateioPorPessoa;
        onUpdate({
          ...d,
          valorContrato: newVal,
          ...(rateio ? { rateioPorPessoa: rateio } : {}),
        });
      };

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
                <span className="block mb-1 font-medium">{label}</span>
                <input
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  value={d[key] ?? ""}
                  onChange={(e) => {
                    if (key === "vagas") {
                      handleVagasChange(e.target.value);
                    } else {
                      set(key, e.target.value);
                    }
                  }}
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="md:col-span-2 block text-xs text-text-muted">
              <span className="block mb-1 font-medium">Itinerário</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.itinerario ?? ""}
                placeholder="Ex: Saída de Cachoeirinha até Aeroporto / Destino"
                onChange={(e) => set("itinerario", e.target.value)}
              />
            </label>
            <label className="block text-xs text-text-muted">
              <span className="block mb-1 font-medium">Sentido / Trajeto</span>
              <select
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-all"
                value={d.trajeto || d.tipoTrajeto || "Ida e Volta"}
                onChange={(e) => {
                  set("trajeto", e.target.value);
                  set("tipoTrajeto", e.target.value);
                }}
              >
                <option value="Ida e Volta">Ida e Volta</option>
                <option value="Só Ida">Só Ida</option>
                <option value="Só Volta">Só Volta</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Valor Contrato (R$)</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.valorContrato ?? ""}
                placeholder="0.00"
                onChange={(e) => handleValorContratoChange(e.target.value)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Rateio por Pessoa (R$)</span>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-semibold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.rateioPorPessoa ?? ""}
                placeholder="0.00"
                onChange={(e) => set("rateioPorPessoa", e.target.value)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Status</span>
              <div className="mt-0.5">
                <StatusSelect value={(d.status as RowStatus) ?? "COTADO"} onChange={(v) => set("status", v)} />
              </div>
            </label>
          </div>

          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre transporte rodoviário..."
          />
        </div>
      );
    }

    // ---- Guias ----
    case "guias": {
      const vagasNum = parseNum(d.vagas) || 20;

      // Helper to calculate totals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let sumGuias = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const g of d.guias ?? []) {
        const dNum = parseNum(g.diarias);
        const vDiaria = parseNum(g.valorDiaria);
        const total =
          g.valorTotal !== undefined && g.valorTotal !== ""
            ? parseNum(g.valorTotal)
            : dNum > 0 && vDiaria > 0
            ? dNum * vDiaria
            : 0;
        sumGuias += total;
      }

      let sumDespesas = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const desp of d.despesas ?? []) {
        sumDespesas += parseNum(desp.valor);
      }

      const totalGeralDespesas = sumGuias + sumDespesas;

      // Rateio por pessoa calculado automaticamente dividindo o total de despesas pelas vagas
      const rateioCalculado = vagasNum > 0 ? (totalGeralDespesas / vagasNum).toFixed(2) : "0.00";

      const handleVagasChange = (newVagas: string) => {
        const vNum = parseNum(newVagas);
        const rateio = vNum > 0 ? (totalGeralDespesas / vNum).toFixed(2) : "0.00";
        onUpdate({
          ...d,
          vagas: newVagas,
          rateioPorPessoa: rateio,
        });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateGuiasAndTotals = (newGuias: any[], newDespesas: any[]) => {
        let sG = 0;
        for (const g of newGuias) {
          sG += parseNum(g.valorTotal);
        }
        let sD = 0;
        for (const dp of newDespesas) {
          sD += parseNum(dp.valor);
        }
        const tot = sG + sD;
        const rateio = vagasNum > 0 ? (tot / vagasNum).toFixed(2) : "0.00";
        onUpdate({
          ...d,
          guias: newGuias,
          despesas: newDespesas,
          totalDiarias: sG.toFixed(2),
          totalOutrasDespesas: sD.toFixed(2),
          totalDespesas: tot.toFixed(2),
          rateioPorPessoa: rateio,
        });
      };

      const handleGuiaDiariasChange = (idx: number, diariasVal: string) => {
        const guias = [...(d.guias ?? [])];
        const g = { ...guias[idx], diarias: diariasVal };
        const dNum = parseNum(diariasVal);
        const currentDiaria =
          g.valorDiaria !== undefined
            ? g.valorDiaria
            : parseNum(g.valorTotal) > 0 && parseNum(guias[idx].diarias) > 0
            ? (parseNum(g.valorTotal) / parseNum(guias[idx].diarias)).toFixed(2)
            : "";
        const vDiariaNum = parseNum(currentDiaria);
        g.valorDiaria = currentDiaria;
        if (diariasVal === "" || currentDiaria === "") {
          g.valorTotal = "";
        } else {
          g.valorTotal = (dNum * vDiariaNum).toFixed(2);
        }
        guias[idx] = g;
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      const handleGuiaValorDiariaChange = (idx: number, vDiariaVal: string) => {
        const guias = [...(d.guias ?? [])];
        const dNum = parseNum(guias[idx].diarias);
        const vDiariaNum = parseNum(vDiariaVal);
        const g = {
          ...guias[idx],
          valorDiaria: vDiariaVal,
          valorTotal: vDiariaVal === "" ? "" : (dNum * vDiariaNum).toFixed(2),
        };
        guias[idx] = g;
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      const handleGuiaValorTotalChange = (idx: number, vTotalVal: string) => {
        const guias = [...(d.guias ?? [])];
        const dNum = parseNum(guias[idx].diarias);
        const vTotalNum = parseNum(vTotalVal);
        const g = {
          ...guias[idx],
          valorTotal: vTotalVal,
          valorDiaria: vTotalVal === "" ? "" : (dNum > 0 ? (vTotalNum / dNum).toFixed(2) : guias[idx].valorDiaria ?? ""),
        };
        guias[idx] = g;
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      const handleAddGuia = () => {
        const newGuia = {
          nome: "",
          tipo: "Acompanhante",
          telefone: "",
          diarias: "1",
          valorDiaria: "0.00",
          valorTotal: "0.00",
          status: "PENDENTE",
        };
        const guias = [...(d.guias ?? []), newGuia];
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      const handleRemoveGuia = (idx: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const guias = (d.guias ?? []).filter((_: any, i: number) => i !== idx);
        updateGuiasAndTotals(guias, d.despesas ?? []);
      };

      // Despesas handlers
      const handleDespesaDescricaoChange = (idx: number, desc: string) => {
        const despesas = [...(d.despesas ?? [])];
        despesas[idx] = { ...despesas[idx], descricao: desc };
        updateGuiasAndTotals(d.guias ?? [], despesas);
      };

      const handleDespesaValorChange = (idx: number, val: string) => {
        const despesas = [...(d.despesas ?? [])];
        despesas[idx] = { ...despesas[idx], valor: val };
        updateGuiasAndTotals(d.guias ?? [], despesas);
      };

      const handleAddDespesa = () => {
        const newDesp = { descricao: "", valor: "0.00" };
        const despesas = [...(d.despesas ?? []), newDesp];
        updateGuiasAndTotals(d.guias ?? [], despesas);
      };

      const handleRemoveDespesa = (idx: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const despesas = (d.despesas ?? []).filter((_: any, i: number) => i !== idx);
        updateGuiasAndTotals(d.guias ?? [], despesas);
      };

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <span className="text-xs text-text-muted">
              Preencha os honorários, diárias e despesas adicionais dos guias com rateio automático por vagas.
            </span>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <span className="font-medium">Total de Vagas:</span>
              <input
                className="w-20 px-2.5 py-1 rounded-lg border border-border bg-surface text-text-body text-sm font-semibold text-right tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={d.vagas ?? "20"}
                placeholder="20"
                onChange={(e) => handleVagasChange(e.target.value)}
              />
            </label>
          </div>

          {/* Tabela de Guias */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={`${thCls} text-left`}>Nome</th>
                  <th className={`${thCls} text-left`}>Tipo</th>
                  <th className={`${thCls} text-left`}>Telefone</th>
                  <th className={`${thCls} text-right w-20`}>Diárias</th>
                  <th className={`${thCls} text-right w-28`}>Valor Diária (R$)</th>
                  <th className={`${thCls} text-right w-28`}>Valor Total (R$)</th>
                  <th className={`${thCls} text-center w-28`}>Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {(d.guias ?? []).map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (g: any, i: number) => {
                    const dNum = parseNum(g.diarias);
                    const tNum = parseNum(g.valorTotal);
                    const vDiariaDisplay =
                      g.valorDiaria !== undefined
                        ? g.valorDiaria
                        : dNum > 0 && tNum > 0
                        ? (tNum / dNum).toFixed(2)
                        : "";

                    const vTotalDisplay = g.valorTotal ?? "";

                    return (
                      <tr key={i}>
                        <td className={tdCls}>
                          <input
                            className={inputCls}
                            value={g.nome ?? ""}
                            placeholder="Nome do guia..."
                            onChange={(e) => setRow("guias", i, "nome", e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={inputCls}
                            value={g.tipo ?? ""}
                            placeholder="Ex: Acompanhante, Local..."
                            onChange={(e) => setRow("guias", i, "tipo", e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={inputCls}
                            value={g.telefone ?? ""}
                            placeholder="(00) 00000-0000"
                            onChange={(e) => setRow("guias", i, "telefone", e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={numCls}
                            value={g.diarias ?? ""}
                            placeholder="1"
                            onChange={(e) => handleGuiaDiariasChange(i, e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={numCls}
                            value={vDiariaDisplay}
                            placeholder="0.00"
                            onChange={(e) => handleGuiaValorDiariaChange(i, e.target.value)}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            className={`${numCls} font-semibold text-primary`}
                            value={vTotalDisplay}
                            placeholder="0.00"
                            onChange={(e) => handleGuiaValorTotalChange(i, e.target.value)}
                          />
                        </td>
                        <td className={`${tdCls} text-center`}>
                          <StatusSelect value={g.status ?? "CONFIRMADO"} onChange={(v) => setRow("guias", i, "status", v)} />
                        </td>
                        <td className={`${tdCls} text-center`}>
                          <DeleteRowBtn onClick={() => handleRemoveGuia(i)} />
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleAddGuia}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Guia
          </button>

          {/* Seção de Despesas Extras do Guia (substituindo Roteiro) */}
          <div className="space-y-2 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-title">
                <DollarSign size={14} className="text-primary" />
                <span>Despesas Adicionais do Guia</span>
              </div>
              <span className="text-xs text-text-muted font-medium">
                Total Despesas Extras: R$ {sumDespesas.toFixed(2)}
              </span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={`${thCls} text-left w-[70%]`}>Descrição da Despesa</th>
                  <th className={`${thCls} text-right w-[24%]`}>Valor (R$)</th>
                  <th className="w-[6%]" />
                </tr>
              </thead>
              <tbody>
                {(d.despesas ?? []).map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (desp: any, i: number) => (
                    <tr key={i}>
                      <td className={tdCls}>
                        <input
                          className={inputCls}
                          value={desp.descricao ?? ""}
                          placeholder="Ex: Alimentação, Transfer, Hospedagem do guia..."
                          onChange={(e) => handleDespesaDescricaoChange(i, e.target.value)}
                        />
                      </td>
                      <td className={tdCls}>
                        <input
                          className={numCls}
                          value={desp.valor ?? ""}
                          placeholder="0.00"
                          onChange={(e) => handleDespesaValorChange(i, e.target.value)}
                        />
                      </td>
                      <td className={`${tdCls} text-center`}>
                        <DeleteRowBtn onClick={() => handleRemoveDespesa(i)} />
                      </td>
                    </tr>
                  )
                )}
                {(!d.despesas || d.despesas.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-2.5 text-center text-xs text-text-muted italic">
                      Nenhuma despesa extra adicionada. Clique abaixo para incluir alimentação, transporte, etc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <button
              onClick={handleAddDespesa}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
            >
              <Plus size={14} /> Adicionar Despesa
            </button>
          </div>

          {/* Resumo Financeiro de Guias e Despesas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border bg-surface-subtle/50">
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Total Diárias Guias (R$)</span>
              <input
                readOnly
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface/70 text-text-body text-sm text-right tabular-nums font-medium focus:outline-none"
                value={sumGuias.toFixed(2)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Outras Despesas (R$)</span>
              <input
                readOnly
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface/70 text-text-body text-sm text-right tabular-nums font-medium focus:outline-none"
                value={sumDespesas.toFixed(2)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <span className="block mb-1 font-medium">Valor Total de Despesas (R$)</span>
              <input
                readOnly
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-body text-sm text-right tabular-nums font-bold text-primary focus:outline-none"
                value={totalGeralDespesas.toFixed(2)}
              />
            </label>
            <label className="text-xs text-text-muted">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Rateio por Pessoa (R$)</span>
                {vagasNum > 0 && (
                  <span className="text-[10px] text-text-muted font-normal">
                    ({vagasNum} {vagasNum === 1 ? "vaga" : "vagas"})
                  </span>
                )}
              </div>
              <input
                readOnly
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface/70 text-text-body text-sm text-right tabular-nums font-bold text-primary focus:outline-none"
                value={rateioCalculado}
              />
            </label>
          </div>

          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre guias e monitores..."
          />
        </div>
      );
    }

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
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary font-medium transition-colors cursor-pointer"
            >
              <Plus size={14} /> Adicionar Coluna
            </button>
          </div>
          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre serviços inclusos..."
          />
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
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Faixa Etária
          </button>
          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações sobre tabela de crianças..."
          />
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
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Dia
          </button>
          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações gerais do roteiro..."
          />
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
            className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Adicionar Linha
          </button>
          <BlockObservation
            value={d.observation}
            onChange={(v) => set("observation", v)}
            placeholder="Observações da tabela..."
          />
        </div>
      );
  }
}
