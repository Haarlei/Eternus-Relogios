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
import { ShoppingBag, Search, Clock, CheckCircle2, Box, Truck, XCircle, CreditCard, MessageCircle, ChevronDown } from "lucide-react";

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
  perfis: { nome: string; telefone: string | null } | null;
}

const STATUS_CONFIG: Record<StatusPedido, { label: string; color: string; icon: typeof Clock }> = {
  "Aguardando Pagamento": { label: "Aguardando Pagamento", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  "Pago":                 { label: "Pago", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle2 },
  "Em Embalagem":         { label: "Em Embalagem", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Box },
  "Enviado aos Correios": { label: "Enviado aos Correios", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Truck },
  "Entregue":             { label: "Entregue", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  "Cancelado":            { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
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
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, loadPedidos)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadPedidos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, status, metodo_pagamento, total, itens, criado_em, user_id, perfis(nome, telefone)")
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
                        {pedido.metodo_pagamento === "Online (InfinitePay)"
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

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pedido #{selected?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              {/* Client info */}
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                <p className="font-semibold">{selected.perfis?.nome || "—"}</p>
                {selected.perfis?.telefone && (
                  <p className="text-sm text-muted-foreground">{selected.perfis.telefone}</p>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Itens do Pedido</p>
                <div className="space-y-2">
                  {selected.itens.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantidade}x {item.nome_produto}</span>
                      <span className="font-medium">{formatCurrency(item.preco * item.quantidade)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(selected.total)}</span>
                  </div>
                </div>
              </div>

              {/* Status update */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Atualizar Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STATUSES.filter(s => s !== selected.status).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(selected.id, s)}
                        disabled={updatingStatus}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all hover:opacity-90 ${cfg.color}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  ⚠️ Ao mover para "Em Embalagem" o estoque dos produtos será descontado automaticamente.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
