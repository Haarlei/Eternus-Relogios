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
import { ShoppingCart, Plus, Trash2 } from "lucide-react";
import { logAtividade } from "@/lib/logger";
import { maskPhone, unmaskValue, maskCurrency, unmaskCurrency } from "@/lib/masks";
// Tipo local com apenas os campos necessários para o formulário de vendas
type Produto = {
  id: string;
  nome_produto: string;
  imagem_url: string | null;
  estoque_atual: number;
  preco_com_margem: number;
  preco_debito: number | null;
  preco_credito: number | null;
  preco_credito_2x: number | null;
};

export default function Vendas() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string; telefone: string }[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [itens, setItens] = useState<{ produto_id: string; quantidade: number }[]>([
    { produto_id: "", quantidade: 1 }
  ]);

  const [form, setForm] = useState({
    metodo_pagamento: "dinheiro",
    tipo_cartao: "", numero_parcelas: 1, possui_juros: false, taxa_juros_mensal: 0,
    nome_cliente: "", telefone_cliente: "",
    data_vencimento_pagamento: "",
    desconto: 0,
    usar_datas_customizadas: false,
  });
  const [datasParcelas, setDatasParcelas] = useState<string[]>([]);

  useEffect(() => { 
    if (user) {
      loadProdutos();
      loadClientes();
    }
  }, [user]);

  useEffect(() => {
    setDatasParcelas(prev => {
      const novas = [...prev];
      if (novas.length < form.numero_parcelas) {
        for (let i = novas.length; i < form.numero_parcelas; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() + i + 1);
          novas.push(d.toISOString().split("T")[0]);
        }
      } else {
        return novas.slice(0, form.numero_parcelas);
      }
      return novas;
    });
  }, [form.numero_parcelas]);

  const loadProdutos = async () => {
    const { data } = await supabase
      .from("produtos")
      .select("id, nome_produto, imagem_url, estoque_atual, preco_com_margem, preco_debito, preco_credito, preco_credito_2x")
      .gt("estoque_atual", 0)
      .order("nome_produto");
    setProdutos(data || []);
  };

  const loadClientes = async () => {
    const { data } = await supabase.from("clientes").select("id, nome, telefone").order("nome");
    setClientes(data || []);
  };

  const handleSelectCliente = (nome: string) => {
    const c = clientes.find(x => x.nome === nome);
    if (c) {
      setForm(f => ({ ...f, nome_cliente: c.nome, telefone_cliente: c.telefone || "" }));
    } else {
      setForm(f => ({ ...f, nome_cliente: nome }));
    }
  };

  const addItem = () => {
    setItens([...itens, { produto_id: "", quantidade: 1 }]);
  };

  const removeItem = (index: number) => {
    if (itens.length === 1) return;
    setItens(itens.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: "produto_id" | "quantidade", value: string | number) => {
    const novos = [...itens];
    novos[index] = { ...novos[index], [field]: value };
    setItens(novos);
  };

  const getPrecoUnitario = (produtoId: string) => {
    const p = produtos.find(x => x.id === produtoId);
    if (!p) return 0;
    switch (form.metodo_pagamento) {
      case "debito": return p.preco_debito || 0;
      case "credito": return p.preco_credito || 0;
      case "parcelado": return p.preco_credito_2x || 0;
      default: return p.preco_com_margem || 0;
    }
  };

  const totalBrutoItens = itens.reduce((sum, item) => {
    return sum + (getPrecoUnitario(item.produto_id) * item.quantidade);
  }, 0);

  const podeDesconto = form.metodo_pagamento === "dinheiro" || form.metodo_pagamento === "pix";
  const desconto = podeDesconto ? Math.max(0, form.desconto || 0) : 0;
  const valorBruto = Math.max(0, totalBrutoItens - desconto);

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
    if (!user || itens.some(i => !i.produto_id)) {
      toast.error("Selecione os produtos para todos os itens.");
      return;
    }

    // Verificar estoque de todos
    for (const item of itens) {
      const p = produtos.find(x => x.id === item.produto_id);
      if (p && item.quantidade > p.estoque_atual) {
        toast.error(`Estoque insuficiente para: ${p.nome_produto}`);
        return;
      }
    }

    setLoading(true);

    try {
      const statusPagamento = (isParcelado || isPrazo) ? "pendente" : "pago";
      let firstVendaId = "";
      const descricoesProdutos: string[] = [];

      // Registrar cada item como uma venda separada
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        const p = produtos.find(x => x.id === item.produto_id)!;
        const pUnitario = getPrecoUnitario(item.produto_id);
        
        // O desconto e juros são aplicados proporcionalmente ou apenas no registro geral?
        // Aqui, registraremos o valor bruto do item individualmente sem o desconto global
        // O valor_bruto na tabela vendas será o preco_unitario * quantidade
        const vBrutoItem = pUnitario * item.quantidade;

        const { data: venda, error: vendaError } = await supabase.from("vendas").insert({
          user_id: user.id, 
          produto_id: item.produto_id, 
          quantidade: item.quantidade,
          preco_unitario: pUnitario, 
          metodo_pagamento: form.metodo_pagamento,
          tipo_cartao: form.tipo_cartao || null, 
          valor_bruto: vBrutoItem, 
          valor_liquido: vBrutoItem,
          numero_parcelas: form.numero_parcelas, 
          possui_juros: form.possui_juros,
          taxa_juros_mensal: form.taxa_juros_mensal, 
          valor_total_com_juros: vBrutoItem, // Juros serão tratados no devedor/parcelas globais
          status_pagamento: statusPagamento,
          data_vencimento_pagamento: isPrazo && form.data_vencimento_pagamento ? form.data_vencimento_pagamento : null,
        }).select().single();

        if (vendaError) throw vendaError;
        if (i === 0) firstVendaId = venda.id;
        descricoesProdutos.push(`${p.nome_produto} (${item.quantidade}x)`);

        // Update stock
        await supabase.from("produtos").update({
          estoque_atual: p.estoque_atual - item.quantidade,
        }).eq("id", item.produto_id);
      }

      // --- CLIENT AUTOMATION ---
      if (form.nome_cliente) {
        const { data: existingClient } = await supabase
          .from("clientes")
          .select("id")
          .eq("nome", form.nome_cliente)
          .maybeSingle();

        const clientData = {
          user_id: user.id,
          nome: form.nome_cliente,
          telefone: unmaskValue(form.telefone_cliente) || null,
          ultimo_produto_id: itens[0].produto_id,
          ultima_compra: new Date().toISOString(),
        };

        if (existingClient) {
          await supabase.from("clientes").update(clientData).eq("id", existingClient.id);
        } else {
          await supabase.from("clientes").insert(clientData);
        }
      }

      // Create parcelas (Geral da compra)
      if (isParcelado && form.numero_parcelas > 1) {
        const parcelas = datasParcelas.map((dataVenc, i) => {
          return {
            user_id: user.id, venda_id: firstVendaId, numero_parcela: i + 1,
            valor_parcela: valorParcela,
            data_vencimento: dataVenc,
            status: "pendente" as const,
          };
        });
        const { error: parcError } = await supabase.from("parcelas").insert(parcelas);
        if (parcError) throw parcError;
      } else if (isPrazo && form.data_vencimento_pagamento) {
        const { error: parcError } = await supabase.from("parcelas").insert([{
          user_id: user.id, venda_id: firstVendaId, numero_parcela: 1,
          valor_parcela: valorBruto,
          data_vencimento: form.data_vencimento_pagamento,
          status: "pendente" as const,
        }]);
        if (parcError) throw parcError;
      }

      // Create devedor for parcelado or prazo
      if (geraDevedor && form.nome_cliente) {
        const valorDevido = isPrazo ? valorBruto : valorComJuros;
        const { error: devError } = await supabase.from("devedores").insert({
          user_id: user.id, nome: form.nome_cliente, telefone: unmaskValue(form.telefone_cliente) || null,
          venda_id: firstVendaId, valor_total_devido: valorDevido,
          valor_pago: 0, saldo_devedor: valorDevido, status: "em_dia",
        });
        if (devError) throw devError;
      }

      await logAtividade({
        userId: user.id, email: user.email, entidade: "venda", entidadeId: firstVendaId,
        acao: "criacao",
        descricao: `Venda múltipla registrada: ${descricoesProdutos.join(", ")} via ${form.metodo_pagamento}`,
        detalhes: {
          valor_bruto: valorBruto,
          valor_total: valorComJuros,
          desconto: desconto,
          parcelas: form.numero_parcelas,
          cliente: form.nome_cliente || null,
        },
      });

      toast.success("Vendas registradas com sucesso!");
      setItens([{ produto_id: "", quantidade: 1 }]);
      setForm({ 
        metodo_pagamento: "dinheiro", 
        tipo_cartao: "", numero_parcelas: 1, possui_juros: false, 
        taxa_juros_mensal: 0, nome_cliente: "", telefone_cliente: "", 
        data_vencimento_pagamento: "", desconto: 0, usar_datas_customizadas: false 
      });
      loadProdutos();
      loadClientes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-foreground">Registrar Nova Venda</h2>

      <Card className="border-primary/20 shadow-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* --- SEÇÃO CLIENTE --- */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm uppercase tracking-wider">Identificação do Cliente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <div className="relative">
                    <Input 
                      value={form.nome_cliente} 
                      onChange={(e) => handleSelectCliente(e.target.value)} 
                      placeholder="Nome completo ou selecione..." 
                      list="lista-clientes"
                    />
                    <datalist id="lista-clientes">
                      {clientes.map(c => <option key={c.id} value={c.nome} />)}
                    </datalist>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telefone / WhatsApp</Label>
                  <Input 
                    value={form.telefone_cliente} 
                    onChange={(e) => setForm({ ...form, telefone_cliente: maskPhone(e.target.value) })} 
                    placeholder="(00) 00000-0000" 
                  />
                </div>
              </div>
            </div>

            {/* --- SEÇÃO PRODUTOS --- */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm uppercase tracking-wider">Itens da Venda</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 gap-1">
                  <Plus className="w-4 h-4" /> Adicionar Produto
                </Button>
              </div>

              <div className="space-y-3">
                {itens.map((item, index) => {
                  const p = produtos.find(x => x.id === item.produto_id);
                  return (
                    <div key={index} className="flex flex-col md:flex-row gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 relative group">
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Produto {index + 1}</Label>
                        <Select value={item.produto_id} onValueChange={(v) => updateItem(index, "produto_id", v)}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione um produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-2">
                                  {p.imagem_url ? (
                                    <img src={p.imagem_url} alt="" className="w-6 h-6 rounded object-cover" />
                                  ) : (
                                    <div className="w-6 h-6 rounded bg-muted border flex items-center justify-center text-[8px]">s/img</div>
                                  )}
                                  <span>{p.nome_produto} (Estoque: {p.estoque_atual})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-full md:w-32 space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Qtd</Label>
                        <Input 
                          type="number" 
                          min={1} 
                          className="bg-background"
                          value={item.quantidade} 
                          onChange={(e) => updateItem(index, "quantidade", +e.target.value)} 
                        />
                      </div>

                      <div className="w-full md:w-40 space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Preço Un.</Label>
                        <div className="h-10 flex items-center px-3 rounded-md bg-background border border-input text-sm font-medium">
                          {formatCurrency(getPrecoUnitario(item.produto_id))}
                        </div>
                      </div>

                      {itens.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="absolute -top-2 -right-2 md:relative md:top-0 md:right-0 h-10 w-10 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => removeItem(index)}
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --- SEÇÃO PAGAMENTO --- */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm uppercase tracking-wider">Pagamento</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
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

                  {(form.metodo_pagamento === "debito" || form.metodo_pagamento === "credito" || form.metodo_pagamento === "parcelado") && (
                    <div className="space-y-2">
                      <Label>Tipo do Cartão</Label>
                      <Input value={form.tipo_cartao} onChange={(e) => setForm({ ...form, tipo_cartao: e.target.value })} placeholder="Ex: Visa, Mastercard" />
                    </div>
                  )}

                  {podeDesconto && (
                    <div className="space-y-2">
                      <Label>Desconto Total (R$)</Label>
                      <Input 
                        value={maskCurrency(form.desconto)} 
                        onChange={(e) => setForm({ ...form, desconto: unmaskCurrency(e.target.value) })} 
                        placeholder="R$ 0,00" 
                      />
                    </div>
                  )}

                  {isPrazo && (
                    <div className="space-y-2">
                      <Label>Data de Vencimento do Pagamento *</Label>
                      <Input type="date" value={form.data_vencimento_pagamento} onChange={(e) => setForm({ ...form, data_vencimento_pagamento: e.target.value })} required />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {form.metodo_pagamento === "parcelado" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nº de Parcelas</Label>
                          <Input type="number" min={2} max={24} value={form.numero_parcelas} onChange={(e) => setForm({ ...form, numero_parcelas: +e.target.value })} />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end gap-3 pb-2">
                          <div className="flex items-center gap-2">
                            <Switch checked={form.possui_juros} onCheckedChange={(c) => setForm({ ...form, possui_juros: c })} />
                            <Label className="text-xs">Com Juros</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={form.usar_datas_customizadas} onCheckedChange={(c) => setForm({ ...form, usar_datas_customizadas: c })} />
                            <Label className="text-xs">Datas Pers.</Label>
                          </div>
                        </div>
                      </div>
                      
                      {form.possui_juros && (
                        <div className="space-y-2">
                          <Label>Taxa de Juros Mensal (%)</Label>
                          <Input type="number" step="0.1" value={form.taxa_juros_mensal} onChange={(e) => setForm({ ...form, taxa_juros_mensal: +e.target.value })} />
                        </div>
                      )}

                      {form.usar_datas_customizadas && (
                        <div className="p-3 bg-muted/20 rounded-lg border border-dashed grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {datasParcelas.map((data, i) => (
                            <div key={i} className="space-y-1">
                              <Label className="text-[9px] text-muted-foreground uppercase">Parc {i + 1}</Label>
                              <Input type="date" className="h-7 text-[10px] px-2" value={data} onChange={(e) => {
                                const novas = [...datasParcelas];
                                novas[i] = e.target.value;
                                setDatasParcelas(novas);
                              }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* --- RESUMO TOTAL --- */}
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Soma dos Itens:</span>
                <span className="font-semibold">{formatCurrency(totalBrutoItens)}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Desconto Aplicado:</span>
                  <span className="font-semibold">- {formatCurrency(desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-base border-t border-primary/10 pt-3">
                <span className="font-bold">Total Final:</span>
                <span className="font-bold text-primary">{formatCurrency(valorBruto)}</span>
              </div>
              {form.possui_juros && form.numero_parcelas > 1 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total com Juros ({form.numero_parcelas}x):</span>
                  <span>{formatCurrency(valorComJuros)}</span>
                </div>
              )}
              {form.numero_parcelas > 1 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Valor de cada parcela:</span>
                  <span className="text-primary font-medium">{formatCurrency(valorParcela)}</span>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-14 text-base font-bold shadow-lg shadow-primary/20" disabled={loading || itens.some(i => !i.produto_id)}>
              {loading ? "Processando Venda..." : <><ShoppingCart className="w-5 h-5 mr-3" /> Finalizar Venda Múltipla</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
