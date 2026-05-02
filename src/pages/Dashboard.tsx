import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, formatPercent } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertTriangle, BarChart3, ShoppingCart, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logAtividade } from "@/lib/logger";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(215, 80%, 48%)", "hsl(40, 95%, 55%)", "hsl(142, 71%, 45%)", "hsl(0, 72%, 51%)", "hsl(270, 60%, 55%)"];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalInvestido: 0,
    totalAReceber: 0,
    lucroEsperado: 0,
    faturamentoLiquido: 0,
    valorEmAtraso: 0,
    taxaInadimplencia: 0,
    receitaPrevista: 0,
  });
  const [topProdutos, setTopProdutos] = useState<any[]>([]);
  const [metodosPagamento, setMetodosPagamento] = useState<any[]>([]);
  const [vendasRecentes, setVendasRecentes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    const [produtosRes, vendasRes, parcelasRes] = await Promise.all([
      supabase.from("produtos").select("preco_fornecedor, estoque_inicial"),
      supabase.from("vendas").select("id, produto_id, quantidade, metodo_pagamento, tipo_cartao, valor_bruto, valor_liquido, criado_em, status_pagamento, produtos(nome_produto)").order("criado_em", { ascending: false }),
      supabase.from("parcelas").select("id, venda_id, valor_parcela, status, data_vencimento"),
    ]);

    const produtos = produtosRes.data || [];
    const vendas = vendasRes.data || [];
    const parcelas = parcelasRes.data || [];

    const totalInvestido = produtos.reduce((s, p) => s + p.preco_fornecedor * p.estoque_inicial, 0);
    const totalAReceber = parcelas.filter(p => p.status !== "pago").reduce((s, p) => s + p.valor_parcela, 0);
    const faturamentoLiquido = vendas.reduce((s, v) => s + v.valor_liquido, 0);
    const lucroEsperado = faturamentoLiquido - totalInvestido;
    const parcelasAtrasadas = parcelas.filter(p => p.status === "atrasado");
    const valorEmAtraso = parcelasAtrasadas.reduce((s, p) => s + p.valor_parcela, 0);
    const taxaInadimplencia = parcelas.length > 0 ? (parcelasAtrasadas.length / parcelas.length) * 100 : 0;
    const receitaPrevista = parcelas.filter(p => p.status === "pendente").reduce((s, p) => s + p.valor_parcela, 0);

    setStats({ totalInvestido, totalAReceber, lucroEsperado, faturamentoLiquido, valorEmAtraso, taxaInadimplencia, receitaPrevista });

    // Top 5 products
    const prodVendas: Record<string, { nome: string; total: number }> = {};
    vendas.forEach((v: any) => {
      const nome = v.produtos?.nome_produto || "Desconhecido";
      if (!prodVendas[v.produto_id]) prodVendas[v.produto_id] = { nome, total: 0 };
      prodVendas[v.produto_id].total += v.quantidade;
    });
    setTopProdutos(Object.values(prodVendas).sort((a, b) => b.total - a.total).slice(0, 5));

    // Payment methods
    const metodos: Record<string, number> = {};
    vendas.forEach(v => {
      metodos[v.metodo_pagamento] = (metodos[v.metodo_pagamento] || 0) + 1;
    });
    setMetodosPagamento(Object.entries(metodos).map(([name, value]) => ({ name, value })));

    setVendasRecentes(vendas.slice(0, 10));
  };

  const handleDeleteVenda = async (v: any) => {
    if (!confirm(`Excluir esta venda de ${v.produtos?.nome_produto || "produto"}? O estoque será restaurado.`)) return;
    try {
      // Delete dependent records
      await supabase.from("devedores").delete().eq("venda_id", v.id);
      await supabase.from("parcelas").delete().eq("venda_id", v.id);

      // Restore stock
      const { data: prod } = await supabase.from("produtos").select("estoque_atual").eq("id", v.produto_id).maybeSingle();
      if (prod) {
        await supabase.from("produtos").update({ estoque_atual: prod.estoque_atual + v.quantidade }).eq("id", v.produto_id);
      }

      const { error } = await supabase.from("vendas").delete().eq("id", v.id);
      if (error) throw error;
      if (user) {
        await logAtividade({
          userId: user.id, email: user.email, entidade: "venda", entidadeId: v.id,
          acao: "exclusao",
          descricao: `Venda excluída: ${v.produtos?.nome_produto || "produto"} (${v.quantidade}x)`,
          detalhes: { valor_bruto: v.valor_bruto, metodo: v.metodo_pagamento, estoque_restaurado: v.quantidade },
        });
      }
      toast.success("Venda excluída e estoque restaurado!");
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const statCards = [
    { title: "Total Investido", value: formatCurrency(stats.totalInvestido), icon: DollarSign, color: "text-primary" },
    { title: "Faturamento Líquido", value: formatCurrency(stats.faturamentoLiquido), icon: TrendingUp, color: "text-success" },
    { title: "Lucro Esperado", value: formatCurrency(stats.lucroEsperado), icon: BarChart3, color: "text-accent" },
    { title: "Valor em Atraso", value: formatCurrency(stats.valorEmAtraso), icon: AlertTriangle, color: "text-destructive" },
    { title: "Receita Prevista", value: formatCurrency(stats.receitaPrevista), icon: ShoppingCart, color: "text-primary" },
    { title: "Inadimplência", value: formatPercent(stats.taxaInadimplencia), icon: CreditCard, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.title} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{s.title}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top 5 Produtos</CardTitle></CardHeader>
          <CardContent>
            {topProdutos.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProdutos}>
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(215, 80%, 48%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma venda registrada</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Métodos de Pagamento</CardTitle></CardHeader>
          <CardContent>
            {metodosPagamento.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={metodosPagamento} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {metodosPagamento.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma venda registrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Vendas Recentes</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Produto</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Método</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Tipo Cartão</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Data</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Bruto</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Líquido</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendasRecentes.map((v: any) => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">{v.produtos?.nome_produto || "-"}</td>
                    <td className="py-3 px-2 capitalize">{v.metodo_pagamento}</td>
                    <td className="py-3 px-2">{v.tipo_cartao || "-"}</td>
                    <td className="py-3 px-2">{formatDate(v.criado_em)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(v.valor_bruto)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(v.valor_liquido)}</td>
                    <td className="py-3 px-2 text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteVenda(v)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {vendasRecentes.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma venda registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
