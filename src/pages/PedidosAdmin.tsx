import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingBag, Search, Clock, CheckCircle2, Box, Truck, XCircle, CreditCard, MessageCircle, ChevronDown, User, Mail, Phone, Download, MoreVertical, Copy, ArrowLeft } from "lucide-react";

type StatusPedido = "Aguardando Pagamento" | "Pago" | "Em Embalagem" | "Enviado aos Correios" | "Entregue" | "Cancelado";

interface PedidoItem {
  nome_produto: string;
  quantidade: number;
  preco: number;
  produto_id?: string;
}

interface Pedido {
  id: string;
  status: StatusPedido;
  metodo_pagamento: string;
  total: number;
  itens: PedidoItem[];
  criado_em: string;
  user_id: string;
  endereco_entrega: any;
  checkout_url?: string | null;
  perfis: { nome: string; telefone: string | null } | null;
}

const STATUS_CONFIG: Record<StatusPedido, { label: string; color: string; icon: typeof Clock }> = {
  "Aguardando Pagamento": { label: "Aguardando Pagamento", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  "Pago": { label: "Pago", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle2 },
  "Em Embalagem": { label: "Em Embalagem", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Box },
  "Enviado aos Correios": { label: "Enviado aos Correios", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Truck },
  "Entregue": { label: "Entregue", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  "Cancelado": { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const ALL_STATUSES: StatusPedido[] = ["Aguardando Pagamento", "Pago", "Em Embalagem", "Enviado aos Correios", "Entregue", "Cancelado"];

export default function PedidosAdmin() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadPedidos();

    // Real-time updates
    const channel = supabase
      .channel("pedidos-admin")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos" }, (payload) => {
        if (payload.old && payload.new && payload.old.status !== "Pago" && payload.new.status === "Pago") {
          toast.success(`💰 Pagamento Confirmado! O pedido #${payload.new.id.slice(0, 8).toUpperCase()} acabou de ser pago.`);
        }
        loadPedidos();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos" }, loadPedidos)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadPedidos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, status, metodo_pagamento, total, itens, criado_em, user_id, endereco_entrega, checkout_url, perfis(nome, telefone)")
      .order("criado_em", { ascending: false });

    if (!error && data) {
      setPedidos(data as unknown as Pedido[]);
    }
    setLoading(false);
  };

  const updateStatus = async (pedidoId: string, newStatus: StatusPedido) => {
    setUpdatingStatus(true);

    // If moving to "Em Embalagem", decrement stock for each item
    if (newStatus === "Em Embalagem") {
      const pedido = pedidos.find(p => p.id === pedidoId);
      if (pedido) {
        for (const item of pedido.itens) {
          if (item.produto_id) {
            // Fetch current stock (only needed field)
            const { data: prod } = await supabase
              .from("produtos")
              .select("estoque_atual")
              .eq("id", item.produto_id)
              .single();

            if (prod) {
              const newStock = Math.max(0, prod.estoque_atual - item.quantidade);
              await supabase
                .from("produtos")
                .update({ estoque_atual: newStock })
                .eq("id", item.produto_id);
            }
          }
        }
      }
    }

    const { error } = await supabase
      .from("pedidos")
      .update({ status: newStatus, atualizado_em: new Date().toISOString() })
      .eq("id", pedidoId);

    if (error) {
      toast.error("Erro ao atualizar status.");
    } else {
      toast.success(`Status atualizado para "${newStatus}"`);
      // Update local state without refetch
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: newStatus } : p));
      if (selected?.id === pedidoId) setSelected(prev => prev ? { ...prev, status: newStatus } : prev);
    }
    setUpdatingStatus(false);
  };

  const filtered = pedidos.filter(p => {
    const matchSearch =
      (p.perfis?.nome || "").toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: pedidos.length,
    aguardando: pedidos.filter(p => p.status === "Aguardando Pagamento").length,
    embalagem: pedidos.filter(p => p.status === "Em Embalagem").length,
    enviados: pedidos.filter(p => p.status === "Enviado aos Correios").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Pedidos do Site</h2>
        <p className="text-sm text-muted-foreground">Gerencie os pedidos feitos pela loja virtual em tempo real.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Pedidos", value: stats.total, color: "text-foreground" },
          { label: "Aguardando Pagto.", value: stats.aguardando, color: "text-amber-600" },
          { label: "Em Embalagem", value: stats.embalagem, color: "text-purple-600" },
          { label: "Enviados", value: stats.enviados, color: "text-indigo-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou ID do pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {ALL_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Pedido</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Cliente</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Método</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Total</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Carregando pedidos...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : filtered.map(pedido => {
                const cfg = STATUS_CONFIG[pedido.status];
                const Icon = cfg.icon;
                return (
                  <tr key={pedido.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-mono text-xs text-muted-foreground">#{pedido.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(pedido.criado_em).toLocaleDateString("pt-BR")}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{pedido.perfis?.nome || "—"}</p>
                      {pedido.perfis?.telefone && (
                        <p className="text-xs text-muted-foreground">{pedido.perfis.telefone}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        {pedido.metodo_pagamento !== "WhatsApp"
                          ? <><CreditCard className="w-3.5 h-3.5 text-blue-500" /> Online</>
                          : <><MessageCircle className="w-3.5 h-3.5 text-green-500" /> WhatsApp</>
                        }
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">{formatCurrency(pedido.total)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setSelected(pedido)}>
                        Gerenciar <ChevronDown className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Detail Modal - Redesenhado Estilo Premium Expandido */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-[950px] w-[95vw] p-0 bg-[#0A0A0A] border-zinc-800 text-white overflow-hidden rounded-3xl shadow-2xl">
          {selected && (
            <div className="flex flex-col max-h-[90vh]">
              {/* Header - Fixo no topo */}
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-zinc-800/50 bg-[#0A0A0A]/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-6">
                  <button onClick={() => setSelected(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-zinc-400" />
                  </button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold">Pedido #{selected.id.slice(0, 8).toUpperCase()}</h2>
                      <Badge className={`${selected.status === "Pago" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                        {selected.status === "Pago" ? "Aprovado" : selected.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                      {new Date(selected.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às {new Date(selected.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="rounded-full border-zinc-800 hover:bg-zinc-800">
                    <Download className="w-5 h-5 text-zinc-400" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full border-zinc-800 hover:bg-zinc-800">
                    <MoreVertical className="w-5 h-5 text-zinc-400" />
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Coluna da Esquerda: Itens e Resumo Financeiro (Mais Larga) */}
                  <div className="lg:col-span-7 space-y-8">
                    <div className="bg-zinc-900/30 rounded-3xl border border-zinc-800/50 p-6">
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-zinc-500" />
                        Produtos no Pedido
                      </h3>
                      <div className="space-y-6">
                        {selected.itens.map((item, i) => (
                          <div key={i} className="flex items-center justify-between group bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/30">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700/50">
                                <ShoppingBag className="w-8 h-8 text-zinc-600" />
                              </div>
                              <div>
                                <p className="text-base font-bold text-zinc-100">{item.nome_produto}</p>
                                <p className="text-sm text-zinc-500">{item.quantidade} unidade{item.quantidade > 1 ? "s" : ""}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-white">{formatCurrency(item.preco * item.quantidade)}</p>
                              <p className="text-xs text-zinc-600">unit. {formatCurrency(item.preco)}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Resumo Financeiro */}
                      <div className="mt-8 pt-6 border-t border-zinc-800/50 space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Subtotal</span>
                          <span className="text-zinc-300 font-medium">{formatCurrency(selected.total)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Taxa de Entrega</span>
                          <span className="text-zinc-300 font-medium">Grátis</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-lg font-bold">Total</span>
                          <span className="text-2xl font-black text-white">{formatCurrency(selected.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gerenciar Status (Movido para área visível) */}
                    <div className="bg-zinc-900/30 rounded-3xl border border-zinc-800/50 p-6">
                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Ações Rápidas de Status</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {ALL_STATUSES.map(s => {
                          const cfg = STATUS_CONFIG[s];
                          const Icon = cfg.icon;
                          const isCurrent = s === selected.status;
                          return (
                            <button
                              key={s}
                              onClick={() => updateStatus(selected.id, s)}
                              disabled={updatingStatus || isCurrent}
                              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${isCurrent ? "bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed" : "border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white hover:scale-[1.02] active:scale-95"}`}
                            >
                              <Icon className="w-5 h-5" />
                              <span className="text-[10px] font-bold uppercase tracking-tighter">{cfg.label.split(" ")[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Coluna da Direita: Cliente, Entrega e Pagamento (Mais Estreita) */}
                  <div className="lg:col-span-5 space-y-8">
                    {/* Meio de Pagamento */}
                    <div className="bg-zinc-900/30 rounded-3xl border border-zinc-800/50 p-6">
                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Pagamento</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-zinc-800 rounded-2xl">
                            <CreditCard className="w-6 h-6 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-zinc-100">{selected.metodo_pagamento}</p>
                            <p className="text-sm text-zinc-500">Transação Processada</p>
                          </div>
                        </div>
                        {selected.metodo_pagamento.includes("Asaas") && <Badge className="bg-emerald-500/20 text-emerald-500 border-none">PIX</Badge>}
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="bg-zinc-900/30 rounded-3xl border border-zinc-800/50 p-6 space-y-6">
                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Informações do Cliente</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-zinc-500" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Nome Completo</p>
                            <p className="text-sm font-bold text-zinc-200">{(selected.endereco_entrega as any)?.cliente?.nome || selected.perfis?.nome || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                              <Mail className="w-5 h-5 text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500">E-mail</p>
                              <p className="text-sm font-bold text-zinc-200">{(selected.endereco_entrega as any)?.cliente?.email || "—"}</p>
                            </div>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText((selected.endereco_entrega as any)?.cliente?.email || ""); toast.success("E-mail copiado!"); }} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800 rounded-lg">
                            <Copy className="w-4 h-4 text-zinc-500" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/30">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                              <Phone className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500">WhatsApp</p>
                              <p className="text-sm font-bold text-zinc-200">{(selected.endereco_entrega as any)?.cliente?.telefone || selected.perfis?.telefone || "—"}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => window.open(`https://wa.me/55${((selected.endereco_entrega as any)?.cliente?.telefone || selected.perfis?.telefone || "").replace(/\D/g, "")}`, "_blank")}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 px-4 rounded-xl text-xs font-bold transition-colors"
                          >
                            Abrir Chat
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Entrega */}
                    <div className="bg-zinc-900/30 rounded-3xl border border-zinc-800/50 p-6">
                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Local de Entrega</h3>
                      {(() => {
                        const addr = (selected.endereco_entrega as any)?.endereco;
                        if (addr && addr.street) {
                          const fullAddr = `${addr.street}, ${addr.number}${addr.complement ? ", " + addr.complement : ""}, ${addr.neighborhood}, ${addr.city} – ${addr.state}, CEP ${addr.zip_code || addr.cep}`;
                          return (
                            <div className="space-y-4">
                              <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800/50 relative group">
                                <p className="text-sm leading-relaxed text-zinc-300 pr-8">{fullAddr}</p>
                                <button 
                                  onClick={() => { navigator.clipboard.writeText(fullAddr); toast.success("Endereço copiado!"); }}
                                  className="absolute top-4 right-4 p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                  <Copy className="w-4 h-4 text-zinc-500" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50 text-center">
                                  <p className="text-[10px] text-zinc-500 uppercase">Cidade</p>
                                  <p className="text-sm font-bold">{addr.city}</p>
                                </div>
                                <div className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50 text-center">
                                  <p className="text-[10px] text-zinc-500 uppercase">Estado</p>
                                  <p className="text-sm font-bold">{addr.state}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return <p className="text-sm italic text-zinc-600">Endereço não disponível.</p>;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Fixo na base */}
              <div className="p-6 md:p-8 bg-[#0A0A0A] border-t border-zinc-800/50 flex gap-4">
                <Button className="flex-1 h-16 bg-white hover:bg-zinc-200 text-black font-black text-lg rounded-2xl gap-3 shadow-xl transition-all active:scale-[0.98]">
                  Baixar Pedido de Venda
                  <Download className="w-6 h-6" />
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)} className="h-16 px-8 rounded-2xl border-zinc-800 text-zinc-400 hover:bg-zinc-900">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
