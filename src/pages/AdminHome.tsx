import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Watch, ShoppingCart, Users, Package, TrendingUp, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    vendasMes: 0,
    pedidosNovos: 0,
    clientesTotal: 0,
    produtosEstoque: 0
  });

  useEffect(() => {
    async function loadStats() {
      const [vendasRes, pedidosRes, novosPedidosRes, clientesRes, produtosRes] = await Promise.all([
        supabase.from("vendas").select("valor_bruto"),
        supabase.from("pedidos").select("total").neq("status", "Aguardando Pagamento").neq("status", "Cancelado"),
        supabase.from("pedidos").select("*", { count: "exact", head: true }).eq("status", "Aguardando Pagamento"),
        supabase.from("perfis").select("*", { count: "exact", head: true }),
        supabase.from("produtos").select("estoque_atual"),
      ]);

      const totalVendasManual = vendasRes.data?.reduce((acc: number, curr: any) => acc + (curr.valor_bruto || 0), 0) || 0;
      const totalVendasOnline = pedidosRes.data?.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0) || 0;
      const totalVendas = totalVendasManual + totalVendasOnline;

      const totalEstoque = produtosRes.data?.reduce((acc: number, curr: any) => acc + (curr.estoque_atual || 0), 0) || 0;

      setStats({
        vendasMes: totalVendas,
        pedidosNovos: novosPedidosRes.count || 0,
        clientesTotal: clientesRes.count || 0,
        produtosEstoque: totalEstoque
      });
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground p-8 md:p-12 text-background shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-serif-elegant font-medium leading-tight">
            Bem-vindo de volta, <span className="text-primary italic">{user?.nome?.split(' ')[0] || 'Admin'}</span>.
          </h1>
          <p className="text-lg text-background/70 font-light leading-relaxed">
            Sua curadoria de tempo está impecável. Aqui está um resumo do que aconteceu na Eternus Relógios enquanto você esteve fora.
          </p>
        </div>
        
        {/* Decorative background element */}
        <Watch className="absolute -right-20 -bottom-20 w-96 h-96 text-background/5 rotate-12" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-[2rem] border-none bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Vendas Totais</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.vendasMes)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Novos Pedidos</p>
              <p className="text-2xl font-bold mt-1">{stats.pedidosNovos}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Total Clientes</p>
              <p className="text-2xl font-bold mt-1">{stats.clientesTotal}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Estoque Total</p>
              <p className="text-2xl font-bold mt-1">{stats.produtosEstoque}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Quote */}
      <div className="text-center py-12 border-t border-border/30">
        <p className="text-muted-foreground italic font-light">"O tempo é o que mais queremos, mas o que pior usamos." — William Penn</p>
      </div>
    </div>
  );
}
