// src/app/(protected)/excursoes/[id]/SharePackageModal.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Share2,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  MessageCircle,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getShareConfig, updateShareConfig } from "@/lib/actions/share-package";

interface SharePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  excursionId: string;
  excursionName: string;
}

export function SharePackageModal({
  isOpen,
  onClose,
  excursionId,
  excursionName,
}: SharePackageModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [shareCode, setShareCode] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [isShareActive, setIsShareActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setErrorMessage("");
      setSavedSuccess(false);
      getShareConfig(excursionId)
        .then((cfg) => {
          setShareCode(cfg.shareCode || "");
          setSharePassword(cfg.sharePassword || "");
          setIsShareActive(cfg.isShareActive);
        })
        .catch((err) => {
          setErrorMessage(err.message || "Erro ao carregar dados de compartilhamento.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, excursionId]);

  const publicUrl = shareCode ? `${origin}/viagem/${shareCode}` : "";

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyWhatsApp = async () => {
    if (!publicUrl) return;
    const pwdText = sharePassword.trim() ? `\n🔑 *Senha de Acesso:* \`${sharePassword.trim()}\`` : "";
    const message = `✈️ *Destino Certo Viagens*\n\nOlá! Confira aqui todos os detalhes, voos, hospedagem e o roteiro completo da sua viagem *${excursionName}*:\n\n🔗 ${publicUrl}${pwdText}\n\nQualquer dúvida, estamos à disposição!`;

    try {
      await navigator.clipboard.writeText(message);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsApp = () => {
    if (!publicUrl) return;
    const pwdText = sharePassword.trim() ? `\n🔑 *Senha de Acesso:* ${sharePassword.trim()}` : "";
    const message = `✈️ *Destino Certo Viagens*\n\nOlá! Confira aqui todos os detalhes, voos, hospedagem e o roteiro completo da sua viagem *${excursionName}*:\n\n🔗 ${publicUrl}${pwdText}\n\nQualquer dúvida, estamos à disposição!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const handleGeneratePassword = () => {
    const clean = excursionName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 6);
    const rand = Math.floor(100 + Math.random() * 900);
    const year = new Date().getFullYear();
    setSharePassword(`${clean || "viagem"}${year}`);
  };

  const handleSave = () => {
    setErrorMessage("");
    setSavedSuccess(false);
    startTransition(async () => {
      try {
        await updateShareConfig(excursionId, {
          shareCode,
          sharePassword,
          isShareActive,
        });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } catch (err: any) {
        setErrorMessage(err.message || "Erro ao salvar configurações.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-surface-subtle/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Share2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-title">
                  Link de Visualização do Pacote
                </h3>
                <p className="text-xs text-text-muted">
                  Página exclusiva para o cliente (sem custos, margens ou valores financeiros)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-title hover:bg-surface transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Conteúdo do Modal */}
          <div className="p-5 overflow-y-auto space-y-5">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="text-xs">Carregando configurações...</span>
              </div>
            ) : (
              <>
                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-status-danger/10 text-status-danger border border-status-danger/20">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Switch de Ativação do Link */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-subtle">
                  <div className="flex items-center gap-2.5">
                    <Globe size={18} className={isShareActive ? "text-primary" : "text-text-muted"} />
                    <div>
                      <span className="text-xs font-bold text-text-title block">
                        Status do Link Público
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {isShareActive
                          ? "Link ativo e acessível por clientes"
                          : "Link suspenso temporariamente"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsShareActive(!isShareActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      isShareActive ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isShareActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Campo do Link Compartilhável */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-title flex items-center justify-between">
                    <span>Endereço do Link (URL)</span>
                    <span className="text-[10px] font-normal text-text-muted">
                      Personalize o código final se desejar
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                      <span className="absolute left-3 text-xs text-text-muted font-medium select-none">
                        /viagem/
                      </span>
                      <input
                        type="text"
                        value={shareCode}
                        onChange={(e) =>
                          setShareCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"))
                        }
                        className="w-full pl-18 pr-3 py-2 text-xs font-semibold rounded-xl border border-border bg-surface text-text-title focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="codigo-da-viagem"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-2 rounded-xl bg-surface-subtle border border-border hover:border-primary text-text-title text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      {copiedLink ? (
                        <>
                          <Check size={14} className="text-status-success" />
                          <span className="text-status-success">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-primary" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Campo de Senha de Acesso */}
                <div className="space-y-1.5 p-4 rounded-xl border border-border bg-surface-subtle/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-title flex items-center gap-1.5">
                      <Lock size={14} className="text-primary" />
                      <span>Senha de Acesso para o Cliente</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles size={12} />
                      <span>Sugerir Senha</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-text-muted leading-relaxed">
                    O cliente precisará digitar esta senha antes de visualizar o roteiro. Se deixar em branco, o link será aberto sem senha.
                  </p>

                  <div className="relative flex items-center mt-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                      placeholder="Deixe em branco ou digite a senha (ex: noronha2026)"
                      className="w-full pl-3 pr-10 py-2 text-xs font-semibold rounded-xl border border-border bg-surface text-text-title focus:outline-none focus:ring-2 focus:ring-primary"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-text-muted hover:text-text-title cursor-pointer"
                      title={showPassword ? "Ocultar Senha" : "Exibir Senha"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Ações de Compartilhamento Rápido */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                    Compartilhamento Rápido
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="px-3.5 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text-title text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {copiedMsg ? (
                        <>
                          <Check size={15} className="text-status-success" />
                          <span className="text-status-success">Texto Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={15} className="text-primary" />
                          <span>Copiar Texto WhatsApp</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                    >
                      <MessageCircle size={15} />
                      <span>Abrir no WhatsApp</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer do Modal */}
          <div className="flex items-center justify-between p-4 border-t border-border bg-surface-subtle/50">
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>Visualizar como Cliente</span>
              </a>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {savedSuccess && (
                <span className="text-xs font-bold text-status-success flex items-center gap-1">
                  <Check size={14} /> Salvo com sucesso!
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-border text-text-muted hover:text-text-title text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || isLoading}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Configurações</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
