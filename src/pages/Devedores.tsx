import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Eye, CreditCard, Phone, Plus, Trash2, Pencil, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { logAtividade } from "@/lib/logger";
import { maskPhone, unmaskValue } from "@/lib/masks";
import type { Tables } from "@/integrations/supabase/types";

type Devedor = Tables<"devedores">;
type Parcela = Tables<"parcelas">;

export default function Devedores() {
  const { user } = useAuth();
  const [devedores, setDevedores] = useState<Devedor[]>([]);
  const [selectedDevedor, setSelectedDevedor] = useState<Devedor | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedParcela, setSelectedParcela] = useState<Parcela | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDevedor, setEditDevedor] = useState<Devedor | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", telefone: "", numero_parcelas: 1 });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDevedor, setHistoryDevedor] = useState<Devedor | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [vendasDisponiveis, setVendasDisponiveis] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    venda_id: "",
    valor_total_devido: 0,
    valor_pago: 0,
  });

  useEffect(() => { if (user) loadDevedores(); }, [user]);

  const openCreate = async () => {
    const { data: vendas } = await supabase
      .from("vendas")
      .select("id, criado_em, valor_bruto, valor_total_com_juros, numero_parcelas, metodo_pagamento, produto_id, produtos(nome_produto)")
      .in("status_pagamento", ["pendente", "atrasado"])
      .order("criado_em", { ascending: false });
    const { data: existentes } = await supabase.from("devedores").select("venda_id");
    const usados = new Set((existentes || []).map((e: any) => e.venda_id));
    setVendasDisponiveis((vendas || []).filter((v: any) => !usados.has(v.id)));
    setForm({ nome: "", telefone: "", venda_id: "", valor_total_devido: 0, valor_pago: 0 });
    setCreateOpen(true);
  };

  const handleSelectVenda = (venda_id: string) => {
    const v = vendasDisponiveis.find((x: any) => x.id === venda_id);
    const total = v ? Number(v.valor_total_com_juros || v.valor_bruto || 0) : 0;
    setForm(f => ({ ...f, venda_id, valor_total_devido: total }));
  };

  const handleCreateDevedor = async () => {
    if (!user) return;
    if (!form.nome.trim()) { toast.error("Informe o nome"); return; }
    if (!form.venda_id) { toast.error("Selecione uma venda"); return; }
    const saldo = Math.max(0, form.valor_total_devido - form.valor_pago);
    const status = saldo <= 0 ? "quitado" : "em_dia";
    const { data: novo, error } = await supabase.from("devedores").insert({
      user_id: user.id,
      nome: form.nome,
      telefone: unmaskValue(form.telefone) || null,
      venda_id: form.venda_id,
      valor_total_devido: form.valor_total_devido,
      valor_pago: form.valor_pago,
      saldo_devedor: saldo,
      status,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await logAtividade({
      userId: user.id, email: user.email, entidade: "devedor", entidadeId: novo?.id,
      acao: "criacao", descricao: `Devedor "${form.nome}" cadastrado`,
      detalhes: { valor_total: form.valor_total_devido, valor_pago: form.valor_pago, saldo },
    });
    toast.success("Devedor cadastrado!");
    setCreateOpen(false);
    loadDevedores();
  };

  const handleDeleteDevedor = async (dev: Devedor) => {
    if (!confirm(`Excluir devedor ${dev.nome}?`)) return;
    const { error } = await supabase.from("devedores").delete().eq("id", dev.id);
    if (error) { toast.error(error.message); return; }
    if (user) {
      await logAtividade({
        userId: user.id, email: user.email, entidade: "devedor", entidadeId: dev.id,
        acao: "exclusao", descricao: `Devedor "${dev.nome}" excluído`,
        detalhes: { saldo_devedor: dev.saldo_devedor },
      });
    }
    toast.success("Devedor excluído");
    loadDevedores();
  };

  const openEdit = async (dev: Devedor) => {
    const { data: venda } = await supabase
      .from("vendas")
      .select("numero_parcelas")
      .eq("id", dev.venda_id)
      .maybeSingle();
    setEditDevedor(dev);
    setEditForm({
      nome: dev.nome,
      telefone: dev.telefone || "",
      numero_parcelas: venda?.numero_parcelas || 1,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editDevedor || !user) return;
    if (!editForm.nome.trim()) { toast.error("Informe o nome"); return; }
    if (editForm.numero_parcelas < 1) { toast.error("Número de parcelas inválido"); return; }

    // Track changes for history
    const changes: Record<string, { antes: any; depois: any }> = {};
    if (editForm.nome !== editDevedor.nome) changes.nome = { antes: editDevedor.nome, depois: editForm.nome };
    if ((editForm.telefone || null) !== editDevedor.telefone) changes.telefone = { antes: editDevedor.telefone, depois: editForm.telefone || null };

    const { error: errDev } = await supabase.from("devedores").update({
      nome: editForm.nome,
      telefone: unmaskValue(editForm.telefone) || null,
    }).eq("id", editDevedor.id);
    if (errDev) { toast.error(errDev.message); return; }

    // Fetch current sale + parcels to decide if we need to regenerate
    const { data: venda } = await supabase
      .from("vendas")
      .select("*")
      .eq("id", editDevedor.venda_id)
      .maybeSingle();

    if (venda && venda.numero_parcelas !== editForm.numero_parcelas) {
      const { data: parcelasExist } = await supabase
        .from("parcelas")
        .select("*")
        .eq("venda_id", editDevedor.venda_id);
      const algumPago = (parcelasExist || []).some((p: any) => p.status === "pago");
      if (algumPago) {
        toast.error("Não é possível alterar parcelas: já existem parcelas pagas.");
        return;
      }

      const total = Number(venda.valor_total_com_juros || venda.valor_bruto || editDevedor.valor_total_devido);
      const novoN = editForm.numero_parcelas;
      const valorParcela = Number((total / novoN).toFixed(2));

      const { error: delErr } = await supabase.from("parcelas").delete().eq("venda_id", editDevedor.venda_id);
      if (delErr) {
        toast.error("Não foi possível recriar as parcelas: " + delErr.message);
        return;
      }

      const base = new Date(venda.criado_em);
      const novas = Array.from({ length: novoN }, (_, i) => {
        const venc = new Date(base);
        venc.setMonth(venc.getMonth() + i + 1);
        return {
          user_id: editDevedor.user_id,
          venda_id: editDevedor.venda_id,
          numero_parcela: i + 1,
          valor_parcela: valorParcela,
          data_vencimento: venc.toISOString().split("T")[0],
          status: "pendente",
        };
      });
      const { error: insErr } = await supabase.from("parcelas").insert(novas);
      if (insErr) { toast.error(insErr.message); return; }

      await supabase.from("vendas").update({ numero_parcelas: novoN }).eq("id", editDevedor.venda_id);
      changes.numero_parcelas = { antes: venda.numero_parcelas, depois: novoN };
    }

    // Log history if anything changed
    if (Object.keys(changes).length > 0) {
      await supabase.from("devedores_historico").insert({
        devedor_id: editDevedor.id,
        user_id: user.id,
        editor_email: user.email || null,
        acao: "edicao",
        alteracoes: changes,
      });
      await logAtividade({
        userId: user.id, email: user.email, entidade: "devedor", entidadeId: editDevedor.id,
        acao: "edicao", descricao: `Devedor "${editForm.nome}" editado`,
        detalhes: changes,
      });
    }

    toast.success("Devedor atualizado!");
    setEditOpen(false);
    loadDevedores();
  };

  const openHistory = async (dev: Devedor) => {
    setHistoryDevedor(dev);
    const { data } = await supabase
      .from("devedores_historico")
      .select("*")
      .eq("devedor_id", dev.id)
      .order("criado_em", { ascending: false });
    setHistorico(data || []);
    setHistoryOpen(true);
  };

  const loadDevedores = async () => {
    const { data } = await supabase.from("devedores").select("*").order("criado_em", { ascending: false });
    setDevedores(data || []);
  };

  const openDetails = async (dev: Devedor) => {
    setSelectedDevedor(dev);
    const { data } = await supabase.from("parcelas").select("*").eq("venda_id", dev.venda_id).order("numero_parcela");

    // Check for overdue
    const today = new Date().toISOString().split("T")[0];
    const updated = (data || []).map(p => {
      if (p.status === "pendente" && p.data_vencimento < today) {
        return { ...p, status: "atrasado" };
      }
      return p;
    });

    // Update overdue in DB
    for (const p of updated) {
      if (p.status === "atrasado" && data?.find(d => d.id === p.id)?.status === "pendente") {
        await supabase.from("parcelas").update({ status: "atrasado" }).eq("id", p.id);
      }
    }

    setParcelas(updated);
    setDialogOpen(true);
  };

  const handlePagarParcela = async (parcela: Parcela) => {
    if (!selectedDevedor) return;

    const { error } = await supabase.from("parcelas").update({
      status: "pago",
      data_pagamento: new Date().toISOString().split("T")[0],
    }).eq("id", parcela.id);

    if (error) { toast.error(error.message); return; }

    const novoPago = selectedDevedor.valor_pago + parcela.valor_parcela;
    const novoSaldo = selectedDevedor.valor_total_devido - novoPago;
    const novoStatus = novoSaldo <= 0 ? "quitado" : "em_dia";

    await supabase.from("devedores").update({
      valor_pago: novoPago, saldo_devedor: Math.max(0, novoSaldo), status: novoStatus,
    }).eq("id", selectedDevedor.id);

    // Check if all parcelas paid, update venda
    const { data: remainingParcelas } = await supabase.from("parcelas").select("*").eq("venda_id", selectedDevedor.venda_id).neq("status", "pago");
    if (!remainingParcelas?.length) {
      await supabase.from("vendas").update({ status_pagamento: "pago" }).eq("id", selectedDevedor.venda_id);
    }

    if (user) {
      await logAtividade({
        userId: user.id, email: user.email, entidade: "parcela", entidadeId: parcela.id,
        acao: "pagamento",
        descricao: `Parcela ${parcela.numero_parcela} de "${selectedDevedor.nome}" paga`,
        detalhes: { valor: parcela.valor_parcela, novo_saldo: Math.max(0, novoSaldo), status: novoStatus },
      });
    }

    toast.success("Pagamento registrado!");
    openDetails({ ...selectedDevedor, valor_pago: novoPago, saldo_devedor: Math.max(0, novoSaldo), status: novoStatus });
    loadDevedores();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "quitado": return <Badge className="badge-success border">Quitado</Badge>;
      case "em_dia": return <Badge className="badge-warning border">Em Dia</Badge>;
      case "atrasado": return <Badge className="badge-danger border">Atrasado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getParcelaStatusBadge = (status: string) => {
    switch (status) {
      case "pago": return <Badge className="badge-success border">Pago</Badge>;
      case "pendente": return <Badge className="badge-warning border">Pendente</Badge>;
      case "atrasado": return <Badge className="badge-danger border">Atrasado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Devedores</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />Cadastrar Devedor
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Nome</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Telefone</th>
              <th className="text-right py-3 px-3 text-muted-foreground font-medium">Total</th>
              <th className="text-right py-3 px-3 text-muted-foreground font-medium">Pago</th>
              <th className="text-right py-3 px-3 text-muted-foreground font-medium">Saldo</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">Status</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {devedores.map(dev => (
              <tr key={dev.id} className={cn("border-b border-border/50 hover:bg-muted/50", dev.status === "atrasado" && "bg-destructive/5")}>
                <td className="py-3 px-3 font-medium">{dev.nome}</td>
                <td className="py-3 px-3">{maskPhone(dev.telefone) || "-"}</td>
                <td className="py-3 px-3 text-right">{formatCurrency(dev.valor_total_devido)}</td>
                <td className="py-3 px-3 text-right">{formatCurrency(dev.valor_pago)}</td>
                <td className="py-3 px-3 text-right font-semibold">{formatCurrency(dev.saldo_devedor)}</td>
                <td className="py-3 px-3 text-center">{getStatusBadge(dev.status)}</td>
                <td className="py-3 px-3 text-center">
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openDetails(dev)}>
                      <Eye className="w-4 h-4 mr-1" />Detalhes
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(dev)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openHistory(dev)} title="Histórico de alterações">
                      <History className="w-4 h-4" />
                    </Button>
                    {dev.telefone && (
                      <Button variant="ghost" size="sm" onClick={() => window.open(`https://wa.me/55${dev.telefone?.replace(/\D/g, "")}?text=Olá, temos parcelas pendentes.`, "_blank")}>
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteDevedor(dev)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {devedores.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                Nenhum devedor registrado
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parcelas - {selectedDevedor?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="stat-card">
                <span className="text-muted-foreground">Total</span>
                <p className="font-bold text-lg">{formatCurrency(selectedDevedor?.valor_total_devido)}</p>
              </div>
              <div className="stat-card">
                <span className="text-muted-foreground">Pago</span>
                <p className="font-bold text-lg text-success">{formatCurrency(selectedDevedor?.valor_pago)}</p>
              </div>
              <div className="stat-card">
                <span className="text-muted-foreground">Saldo</span>
                <p className="font-bold text-lg text-destructive">{formatCurrency(selectedDevedor?.saldo_devedor)}</p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground">Nº</th>
                  <th className="text-right py-2 px-2 text-muted-foreground">Valor</th>
                  <th className="text-left py-2 px-2 text-muted-foreground">Vencimento</th>
                  <th className="text-center py-2 px-2 text-muted-foreground">Status</th>
                  <th className="text-center py-2 px-2 text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map(p => (
                  <tr key={p.id} className={cn("border-b border-border/50", p.status === "atrasado" && "bg-destructive/5")}>
                    <td className="py-2 px-2">{p.numero_parcela}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(p.valor_parcela)}</td>
                    <td className="py-2 px-2">{formatDate(p.data_vencimento)}</td>
                    <td className="py-2 px-2 text-center">{getParcelaStatusBadge(p.status)}</td>
                    <td className="py-2 px-2 text-center">
                      {p.status !== "pago" && (
                        <Button size="sm" variant="outline" onClick={() => handlePagarParcela(p)}>
                          <CreditCard className="w-3 h-3 mr-1" />Pagar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Devedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do devedor" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Venda *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.venda_id}
                onChange={e => handleSelectVenda(e.target.value)}
              >
                <option value="">Selecione uma venda pendente</option>
                {vendasDisponiveis.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.produtos?.nome_produto || "Produto"} - {formatCurrency(v.valor_total_com_juros || v.valor_bruto)} ({v.numero_parcelas}x)
                  </option>
                ))}
              </select>
              {vendasDisponiveis.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Nenhuma venda pendente disponível.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor Total Devido</Label>
                <Input type="number" step="0.01" value={form.valor_total_devido} onChange={e => setForm({ ...form, valor_total_devido: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Valor Já Pago</Label>
                <Input type="number" step="0.01" value={form.valor_pago} onChange={e => setForm({ ...form, valor_pago: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateDevedor}>Cadastrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Devedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={editForm.telefone} onChange={e => setEditForm({ ...editForm, telefone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Número de Parcelas</Label>
              <Input
                type="number"
                min={1}
                value={editForm.numero_parcelas}
                onChange={e => setEditForm({ ...editForm, numero_parcelas: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">Alterar recria as parcelas pendentes (não permitido se houver parcelas pagas).</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Alterações - {historyDevedor?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {historico.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                Nenhuma alteração registrada
              </div>
            )}
            {historico.map((h: any) => (
              <div key={h.id} className="border border-border rounded-lg p-3 text-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium capitalize">{h.acao}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.criado_em).toLocaleString("pt-BR")}
                  </span>
                </div>
                {h.editor_email && (
                  <p className="text-xs text-muted-foreground mb-2">por {h.editor_email}</p>
                )}
                {h.alteracoes && Object.entries(h.alteracoes).map(([campo, vals]: [string, any]) => (
                  <div key={campo} className="text-xs flex gap-2 py-1 border-t border-border/50">
                    <span className="font-medium capitalize">{campo}:</span>
                    <span className="text-destructive line-through">{String(vals.antes ?? "-")}</span>
                    <span>→</span>
                    <span className="text-success">{String(vals.depois ?? "-")}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
