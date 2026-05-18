import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  User, Package, LogOut, ChevronRight, Clock, CheckCircle2,
  Truck, Box, ShoppingBag, AlertCircle, CreditCard, MessageCircle, LayoutDashboard, Edit2, Phone, Mail, Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskPhone, unmaskValue } from "@/lib/masks";

interface PedidoItem {
  nome_produto: string;
  quantidade: number;
  preco: number;
}

interface Pedido {
  id: string;
  status: string;
  metodo_pagamento: string;
  total: number;
  itens: PedidoItem[];
  criado_em: string;
  checkout_url: string | null;
}

// Status timeline for order tracking
const STATUS_STEPS = [
  { key: "Aguardando Pagamento", label: "Aguardando Pagamento", icon: Clock },
  { key: "Pago", label: "Pagamento Confirmado", icon: CheckCircle2 },
  { key: "Em Embalagem", label: "Em Embalagem", icon: Box },
  { key: "Enviado aos Correios", label: "Enviado aos Correios", icon: Truck },
  { key: "Entregue", label: "Entregue!", icon: CheckCircle2 },
];

function OrderTimeline({ status }: { status: string }) {
  const currentIndex = STATUS_STEPS.findIndex(s => s.key === status);
  const isCancelled = status === "Cancelado";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm font-medium mt-3">
        <AlertCircle className="w-4 h-4" />
        Pedido Cancelado
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-start gap-0">
        {STATUS_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                <div className={`flex-1 h-[2px] ${idx === 0 ? "invisible" : isActive ? "bg-primary" : "bg-border"}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${isActive ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"} ${isCurrent ? "ring-2 ring-primary/30 ring-offset-2" : ""}`}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <div className={`flex-1 h-[2px] ${idx === STATUS_STEPS.length - 1 ? "invisible" : isActive && idx < currentIndex ? "bg-primary" : "bg-border"}`} />
              </div>
              <span className={`text-[9px] mt-1.5 text-center leading-tight max-w-[60px] ${isCurrent ? "text-primary font-bold" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditProfileDialog({ user, onUpdate }: { user: any, onUpdate: (updates: any) => Promise<void> }) {
  const [nome, setNome] = useState(user?.nome || "");
  const [telefone, setTelefone] = useState(user?.telefone || "");
  const [endereco, setEndereco] = useState(user?.endereco || {
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: ""
  });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);

  // Trigger lookup automatically when CEP is 8 digits (sanitized)
  useEffect(() => {
    const cleanCEP = endereco.cep.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      handleLookupCEP(cleanCEP);
    }
  }, [endereco.cep]);

  const handleLookupCEP = async (cepValue: string) => {
    const cleanCEP = cepValue.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    setLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setEndereco(prev => ({
        ...prev,
        cep: cleanCEP,
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      }));
      toast.success("Endereço preenchido automaticamente!");
    } catch (err) {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setLoadingCEP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate({ 
        nome, 
        telefone: unmaskValue(telefone),
        endereco 
      });
      toast.success("Perfil atualizado!");
      setOpen(false);
    } catch (err) {
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full border-primary/20 hover:bg-primary/5">
          <Edit2 className="w-3.5 h-3.5" />
          Editar Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-elegant text-2xl">Editar Informações</DialogTitle>
          <DialogDescription>
            Mantenha seus dados sempre atualizados para facilitar suas compras.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Básico</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input
                  id="edit-name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">WhatsApp</Label>
                <Input
                  id="edit-phone"
                  value={maskPhone(telefone)}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
            </div>

            {/* Address Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Endereço</h3>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={endereco.cep}
                    onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })}
                    placeholder="00000-000"
                    maxLength={10}
                  />
                  {loadingCEP && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-primary" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rua">Rua</Label>
                <Input
                  id="rua"
                  value={endereco.rua}
                  onChange={(e) => setEndereco({...endereco, rua: e.target.value})}
                  placeholder="Rua..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={endereco.numero}
                onChange={(e) => setEndereco({...endereco, numero: e.target.value})}
                placeholder="123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={endereco.bairro}
                onChange={(e) => setEndereco({...endereco, bairro: e.target.value})}
                placeholder="Centro"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={endereco.cidade} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">UF</Label>
              <Input id="estado" value={endereco.estado} disabled className="bg-muted/50" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              value={endereco.complemento}
              onChange={(e) => setEndereco({...endereco, complemento: e.target.value})}
              placeholder="Apto, Bloco, etc."
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold">
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MinhaConta() {
  const { user, signOut, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/entrar", { state: { redirect: "/minha-conta" } });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadPedidos();
    }
  }, [user]);

  const loadPedidos = async () => {
    setLoadingPedidos(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, status, metodo_pagamento, total, itens, criado_em, checkout_url")
      .eq("user_id", user!.id)
      .order("criado_em", { ascending: false });

    if (!error && data) {
      setPedidos(data as unknown as Pedido[]);
    }
    setLoadingPedidos(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Até logo!");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-32 pb-12 max-w-4xl">
      {/* Header do Perfil */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-serif-elegant tracking-wide">
              {user?.nome || "Minha Conta"}
            </h1>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="w-3 h-3" />
                {user?.email}
              </p>
              {user?.telefone && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  {maskPhone(user.telefone)}
                </p>
              )}
            </div>
            <div className="mt-3">
              <EditProfileDialog user={user} onUpdate={updateProfile} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user?.is_admin && (
            <Button 
              onClick={() => navigate("/dashboard")} 
              className="gap-2 rounded-full bg-foreground text-background hover:bg-primary hover:text-white transition-all shadow-lg"
            >
              <LayoutDashboard className="w-4 h-4" />
              Painel Administrativo
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2 rounded-full">
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <Link to="/colecao" className="p-5 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all group flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Explorar</p>
            <p className="font-semibold mt-1">Coleção</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
        <Link to="/carrinho" className="p-5 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all group flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Compras</p>
            <p className="font-semibold mt-1">Meu Carrinho</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Histórico de Pedidos */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Meus Pedidos</h2>
        </div>

        {loadingPedidos ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Você ainda não fez nenhum pedido.</p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate("/colecao")}>
              Explorar a Coleção
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map(pedido => (
              <div key={pedido.id} className="p-5 rounded-2xl border border-border bg-card">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Pedido #{pedido.id.slice(0, 8).toUpperCase()} · {pedido.metodo_pagamento}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(pedido.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">{formatCurrency(pedido.total)}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-1">
                  {(pedido.itens as PedidoItem[]).map((item, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {item.quantidade}x {item.nome_produto} — {formatCurrency(item.preco)}
                    </p>
                  ))}
                </div>

                {/* Timeline de Status */}
                <OrderTimeline status={pedido.status} />

                {/* Botão Retomar Pagamento Online */}
                {pedido.status === "Aguardando Pagamento" && pedido.metodo_pagamento !== "WhatsApp" && pedido.checkout_url && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <a
                      href={pedido.checkout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Retomar Pagamento Online
                    </a>
                    <p className="text-[10px] text-muted-foreground mt-2">O link de pagamento ainda está ativo. Clique para concluir.</p>
                  </div>
                )}

                {/* Botão Continuar pelo WhatsApp */}
                {pedido.status === "Aguardando Pagamento" && pedido.metodo_pagamento === "WhatsApp" && (() => {
                  const itensList = (pedido.itens as PedidoItem[])
                    .map((item, i) => `${i + 1}. *${item.nome_produto}* (${item.quantidade}x)`)
                    .join("\n");
                  const msg = `Olá! Meu pedido #${pedido.id.slice(0, 8).toUpperCase()} ainda está aguardando pagamento.\n\nItens:\n${itensList}\n\nTotal: R$${pedido.total.toFixed(2).replace(".", ",")}\n\nGostaria de concluir a compra!`;
                  return (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <a
                        href={`https://wa.me/5585987939498?text=${encodeURIComponent(msg)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20 text-xs font-bold uppercase tracking-wider hover:bg-green-500 hover:text-white transition-all duration-300"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Continuar no WhatsApp
                      </a>
                      <p className="text-[10px] text-muted-foreground mt-2">Clique para retomar a negociação com a nossa equipe.</p>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
