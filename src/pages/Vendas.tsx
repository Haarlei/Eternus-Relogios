import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShoppingCart, Plus } from "lucide-react";
import { logAtividade } from "@/lib/logger";
import type { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;

export default function Vendas() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    produto_id: "", quantidade: 1, metodo_pagamento: "dinheiro",
    tipo_cartao: "", numero_parcelas: 1, possui_juros: false, taxa_juros_mensal: 0,
    nome_devedor: "", telefone_devedor: "",
    data_vencimento_pagamento: "",
    desconto: 0,
  });

  useEffect(() => { if (user) loadProdutos(); }, [user]);

  const loadProdutos = async () => {
    const { data } = await supabase.from("produtos").select("*").gt("estoque_atual", 0).order("nome_produto");
    setProdutos(data || []);
  };

  const produtoSelecionado = produtos.find(p => p.id === form.produto_id);

  const getPrecoUnitario = () => {
    if (!produtoSelecionado) return 0;
    switch (form.metodo_pagamento) {
      case "debito": return produtoSelecionado.preco_debito || 0;
      case "credito": return produtoSelecionado.preco_credito || 0;
      case "parcelado": return produtoSelecionado.preco_credito_2x || 0;
      default: return produtoSelecionado.preco_com_margem || 0;
    }
  };

  const precoUnitario = getPrecoUnitario();
  const valorBrutoSemDesconto = precoUnitario * form.quantidade;
  const podeDesconto = form.metodo_pagamento === "dinheiro" || form.metodo_pagamento === "pix";
  const desconto = podeDesconto ? Math.max(0, form.desconto || 0) : 0;
  const valorBruto = Math.max(0, valorBrutoSemDesconto - desconto);

  const calcularComJuros = () => {
    if (!form.possui_juros || form.taxa_juros_mensal <= 0 || form.numero_parcelas <= 1) return valorBruto;
    const taxa = form.taxa_juros_mensal / 100;
    const n = form.numero_parcelas;
    return valorBruto * Math.pow(1 + taxa, n);
  };

  const valorComJuros = calcularComJuros();
  const valorParcela = form.numero_parcelas > 0 ? valorComJuros / form.numero_parcelas : valorComJuros;

  const isPrazo = form.metodo_pagamento === "prazo";
  const isParcelado = form.metodo_pagamento === "parcelado" || form.numero_parcelas > 1;
  const geraDevedor = isParcelado || isPrazo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !produtoSelecionado) return;
    if (form.quantidade > produtoSelecionado.estoque_atual) {
      toast.error("Quantidade excede o estoque disponível!");
      return;
    }
    setLoading(true);

    try {
      const statusPagamento = (isParcelado || isPrazo) ? "pendente" : "pago";
      const { data: venda, error: vendaError } = await supabase.from("vendas").insert({
        user_id: user.id, produto_id: form.produto_id, quantidade: form.quantidade,
        preco_unitario: precoUnitario, metodo_pagamento: form.metodo_pagamento,
        tipo_cartao: form.tipo_cartao || null, valor_bruto: valorBruto, valor_liquido: valorBruto,
        numero_parcelas: form.numero_parcelas, possui_juros: form.possui_juros,
        taxa_juros_mensal: form.taxa_juros_mensal, valor_total_com_juros: valorComJuros,
        status_pagamento: statusPagamento,
        data_vencimento_pagamento: isPrazo && form.data_vencimento_pagamento ? form.data_vencimento_pagamento : null,
      }).select().single();

      if (vendaError) throw vendaError;

      // Update stock
      await supabase.from("produtos").update({
        estoque_atual: produtoSelecionado.estoque_atual - form.quantidade,
      }).eq("id", form.produto_id);

      // Create parcelas if parcelado OR prazo (single parcel for prazo)
      if (isParcelado && form.numero_parcelas > 1) {
        const parcelas = Array.from({ length: form.numero_parcelas }, (_, i) => {
          const vencimento = new Date();
          vencimento.setMonth(vencimento.getMonth() + i + 1);
          return {
            user_id: user.id, venda_id: venda.id, numero_parcela: i + 1,
            valor_parcela: valorParcela,
            data_vencimento: vencimento.toISOString().split("T")[0],
            status: "pendente" as const,
          };
        });
        const { error: parcError } = await supabase.from("parcelas").insert(parcelas);
        if (parcError) throw parcError;
      } else if (isPrazo && form.data_vencimento_pagamento) {
        const { error: parcError } = await supabase.from("parcelas").insert([{
          user_id: user.id, venda_id: venda.id, numero_parcela: 1,
          valor_parcela: valorBruto,
          data_vencimento: form.data_vencimento_pagamento,
          status: "pendente" as const,
        }]);
        if (parcError) throw parcError;
      }

      // Create devedor for parcelado or prazo
      if (geraDevedor && form.nome_devedor) {
        const valorDevido = isPrazo ? valorBruto : valorComJuros;
        const { error: devError } = await supabase.from("devedores").insert({
          user_id: user.id, nome: form.nome_devedor, telefone: form.telefone_devedor || null,
          venda_id: venda.id, valor_total_devido: valorDevido,
          valor_pago: 0, saldo_devedor: valorDevido, status: "em_dia",
        });
        if (devError) throw devError;
      }

      await logAtividade({
        userId: user.id, email: user.email, entidade: "venda", entidadeId: venda.id,
        acao: "criacao",
        descricao: `Venda registrada: ${produtoSelecionado.nome_produto} (${form.quantidade}x) via ${form.metodo_pagamento}`,
        detalhes: {
          valor_bruto: valorBruto,
          valor_total: valorComJuros,
          parcelas: form.numero_parcelas,
          cliente: form.nome_devedor || null,
          vencimento: form.data_vencimento_pagamento || null,
        },
      });

      toast.success("Venda registrada com sucesso!");
      setForm({ produto_id: "", quantidade: 1, metodo_pagamento: "dinheiro", tipo_cartao: "", numero_parcelas: 1, possui_juros: false, taxa_juros_mensal: 0, nome_devedor: "", telefone_devedor: "", data_vencimento_pagamento: "", desconto: 0 });
      loadProdutos();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Registrar Venda</h2>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={form.produto_id} onValueChange={(v) => setForm({ ...form, produto_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent>
                  {produtos.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        {p.imagem_url ? (
                          <img src={p.imagem_url} alt={p.nome_produto} className="w-8 h-8 rounded object-cover border" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted border flex items-center justify-center text-[10px] text-muted-foreground">s/img</div>
                        )}
                        <span>{p.nome_produto} (Estoque: {p.estoque_atual})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {produtoSelecionado && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm flex items-center gap-3">
                {produtoSelecionado.imagem_url ? (
                  <img src={produtoSelecionado.imagem_url} alt={produtoSelecionado.nome_produto} className="w-16 h-16 rounded-md object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-muted border flex items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
                )}
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{produtoSelecionado.nome_produto}</div>
                  <div className="text-xs text-muted-foreground">Estoque atual: <strong className="text-foreground">{produtoSelecionado.estoque_atual}</strong></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" min={1} max={produtoSelecionado?.estoque_atual || 999} value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: +e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <Select value={form.metodo_pagamento} onValueChange={(v) => setForm({ ...form, metodo_pagamento: v, numero_parcelas: v === "parcelado" ? 2 : 1 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                    <SelectItem value="prazo">A Prazo (1x em data futura)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.metodo_pagamento === "debito" || form.metodo_pagamento === "credito" || form.metodo_pagamento === "parcelado") && (
              <div className="space-y-2">
                <Label>Tipo do Cartão</Label>
                <Input value={form.tipo_cartao} onChange={(e) => setForm({ ...form, tipo_cartao: e.target.value })} placeholder="Ex: Visa, Mastercard" />
              </div>
            )}

            {podeDesconto && (
              <div className="space-y-2">
                <Label>Desconto (R$)</Label>
                <Input type="number" min={0} step="0.01" max={valorBrutoSemDesconto} value={form.desconto} onChange={(e) => setForm({ ...form, desconto: +e.target.value })} placeholder="0,00" />
                <p className="text-xs text-muted-foreground">Valor a ser subtraído do total (ex: produto R$ 190, desconto R$ 15 = cliente paga R$ 175)</p>
              </div>
            )}

            {isPrazo && (
              <>
                <div className="space-y-2">
                  <Label>Data de Vencimento do Pagamento *</Label>
                  <Input type="date" value={form.data_vencimento_pagamento} onChange={(e) => setForm({ ...form, data_vencimento_pagamento: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Cliente</Label>
                    <Input value={form.nome_devedor} onChange={(e) => setForm({ ...form, nome_devedor: e.target.value })} placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.telefone_devedor} onChange={(e) => setForm({ ...form, telefone_devedor: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </>
            )}

            {form.metodo_pagamento === "parcelado" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nº de Parcelas</Label>
                    <Input type="number" min={2} max={24} value={form.numero_parcelas} onChange={(e) => setForm({ ...form, numero_parcelas: +e.target.value })} />
                  </div>
                  <div className="space-y-2 flex items-end gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={form.possui_juros} onCheckedChange={(c) => setForm({ ...form, possui_juros: c })} />
                      <Label>Com Juros</Label>
                    </div>
                  </div>
                </div>
                {form.possui_juros && (
                  <div className="space-y-2">
                    <Label>Taxa de Juros Mensal (%)</Label>
                    <Input type="number" step="0.1" value={form.taxa_juros_mensal} onChange={(e) => setForm({ ...form, taxa_juros_mensal: +e.target.value })} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Devedor</Label>
                    <Input value={form.nome_devedor} onChange={(e) => setForm({ ...form, nome_devedor: e.target.value })} placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.telefone_devedor} onChange={(e) => setForm({ ...form, telefone_devedor: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </>
            )}

            <Card className="bg-muted/50 border-dashed">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Preço Unitário:</span><strong>{formatCurrency(precoUnitario)}</strong></div>
                {desconto > 0 && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><strong>{formatCurrency(valorBrutoSemDesconto)}</strong></div>
                    <div className="flex justify-between text-success"><span>Desconto:</span><strong>- {formatCurrency(desconto)}</strong></div>
                  </>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Valor Bruto:</span><strong>{formatCurrency(valorBruto)}</strong></div>
                {form.possui_juros && form.numero_parcelas > 1 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Valor com Juros:</span><strong>{formatCurrency(valorComJuros)}</strong></div>
                )}
                {form.numero_parcelas > 1 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Valor por Parcela:</span><strong>{formatCurrency(valorParcela)}</strong></div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={loading || !form.produto_id}>
              {loading ? "Registrando..." : <><ShoppingCart className="w-4 h-4 mr-2" />Adicionar Venda</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
