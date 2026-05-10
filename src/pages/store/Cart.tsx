import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus, ShoppingBag, CreditCard, ArrowLeft, MessageCircle, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

const WHATSAPP = "5585987939498";

export default function Cart() {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Validates stock in DB before creating order
  const validateStock = async (): Promise<boolean> => {
    const ids = items.map(i => i.id);
    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome_produto, estoque_atual")
      .in("id", ids);

    if (error || !data) return true; // allow through if can't check

    const esgotados: string[] = [];
    const semEstoque: string[] = [];

    for (const item of items) {
      const prod = data.find(p => p.id === item.id);
      if (!prod || prod.estoque_atual <= 0) {
        esgotados.push(item.nome_produto);
      } else if (prod.estoque_atual < item.quantidade) {
        semEstoque.push(`${item.nome_produto} (disponível: ${prod.estoque_atual})`);
      }
    }

    if (esgotados.length > 0) {
      toast.error(`Produto esgotado: ${esgotados.join(", ")}. Remova-o do carrinho para continuar.`);
      return false;
    }
    if (semEstoque.length > 0) {
      toast.error(`Estoque insuficiente: ${semEstoque.join(", ")}`);
      return false;
    }
    return true;
  };

  // Creates order in DB then opens WhatsApp
  const handleWhatsAppCheckout = async () => {
    if (!user) {
      return navigate("/entrar", { state: { redirect: "/carrinho" } });
    }
    setIsCheckingOut(true);
    try {
      const ok = await validateStock();
      if (!ok) { setIsCheckingOut(false); return; }

      const itens = items.map(item => ({
        nome_produto: item.nome_produto,
        quantidade: item.quantidade,
        preco: item.preco,
        produto_id: item.id,
      }));

      // Garante que o perfil existe (cria se não existir)
      await supabase.from("perfis").upsert({
        id: user.id,
        nome: user.nome || user.email?.split("@")[0] || "Cliente",
      }, { onConflict: "id", ignoreDuplicates: true });

      const { error } = await supabase.from("pedidos").insert({
        user_id: user.id,
        status: "Aguardando Pagamento",
        metodo_pagamento: "WhatsApp",
        total: totalPrice,
        itens,
      });

      if (error) throw new Error(error.message);

      // Build WhatsApp message
      let message = `Olá! Gostaria de finalizar a compra dos seguintes itens:\n\n`;
      items.forEach((item, index) => {
        message += `${index + 1}. *${item.nome_produto}*\n   Qtd: ${item.quantidade}x ${formatCurrency(item.preco)}\n`;
      });
      message += `\n*Total estimado:* ${formatCurrency(totalPrice)}\n\nQuais são as opções de pagamento e envio?`;

      clearCart();
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
      toast.success("Pedido registrado! Continuando no WhatsApp...");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível registrar o pedido.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Creates order in DB then redirects to InfinitePay
  const handleOnlineCheckout = async () => {
    if (!user) {
      return navigate("/entrar", { state: { redirect: "/carrinho" } });
    }
    setIsCheckingOut(true);
    try {
      const ok = await validateStock();
      if (!ok) { setIsCheckingOut(false); return; }

      const itens = items.map(item => ({
        nome_produto: item.nome_produto,
        quantidade: item.quantidade,
        preco: item.preco,
        produto_id: item.id,
      }));

      // Garante que o perfil existe
      await supabase.from("perfis").upsert({
        id: user.id,
        nome: user.nome || user.email?.split("@")[0] || "Cliente",
      }, { onConflict: "id", ignoreDuplicates: true });

      // Create the pending order first
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          user_id: user.id,
          status: "Aguardando Pagamento",
          metodo_pagamento: "Online (InfinitePay)",
          total: totalPrice,
          itens,
        })
        .select("id")
        .single();

      if (pedidoError || !pedido) throw new Error(pedidoError?.message || "Erro ao registrar pedido.");

      // Call edge function with order ID
      const { data, error } = await supabase.functions.invoke("create_infinitepay_checkout", {
        body: {
          items,
          total_amount: totalPrice,
          redirect_url: `${window.location.origin}/pagamento-concluido`,
          order_id: pedido.id,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.checkout_url) {
        // Salva a URL de pagamento no pedido para o cliente poder retomar depois
        await supabase
          .from("pedidos")
          .update({ checkout_url: data.checkout_url })
          .eq("id", pedido.id);

        clearCart();
        window.location.href = data.checkout_url;
      } else {
        throw new Error("URL de pagamento não retornada.");
      }
    } catch (err: any) {
      console.error("Erro no checkout:", err);
      toast.error(err.message || "Não foi possível iniciar o checkout.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Você ainda não adicionou nenhum relógio ao seu carrinho. Explore nossa coleção!
        </p>
        <Button size="lg" onClick={() => navigate("/")} className="rounded-2xl px-8">
          Ver produtos
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Seu Carrinho</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Lista de itens */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm items-center">
              <div className="w-20 h-20 bg-muted rounded-xl flex-shrink-0 overflow-hidden">
                {item.imagem_url ? (
                  <img src={item.imagem_url} alt={item.nome_produto} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sem foto</div>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <Link to={`/produto/${item.id}`} className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                  {item.nome_produto}
                </Link>
                <span className="text-primary font-bold mt-1">{formatCurrency(item.preco)}</span>
              </div>

              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{item.quantidade}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background transition-colors"
                    disabled={item.quantidade >= item.estoque_disponivel}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="w-full lg:w-1/3">
          <div className="p-6 rounded-3xl border border-border bg-card shadow-lg sticky top-24">
            <h2 className="text-xl font-bold mb-6">Resumo do Pedido</h2>

            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({items.reduce((a, b) => a + b.quantidade, 0)} itens)</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>A combinar</span>
              </div>

              <div className="border-t border-border pt-4 flex justify-between font-bold text-lg text-foreground">
                <span>Total Estimado</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {/* Prompt de login se não estiver logado */}
            {!user && (
              <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2 text-sm">
                <LogIn className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground">
                  Faça <button onClick={() => navigate("/entrar", { state: { redirect: "/carrinho" } })} className="text-primary font-semibold hover:underline">login</button> para finalizar seu pedido.
                </p>
              </div>
            )}

            {/* Botão InfinitePay */}
            <Button
              size="lg"
              className="w-full h-12 text-sm font-semibold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground mb-3 transition-all hover:-translate-y-0.5"
              onClick={handleOnlineCheckout}
              disabled={isCheckingOut}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isCheckingOut ? "Aguarde..." : "Pagar Online (Pix ou Cartão)"}
            </Button>

            {/* Divisor */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Botão WhatsApp */}
            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 text-sm font-semibold rounded-2xl mb-4"
              onClick={handleWhatsAppCheckout}
              disabled={isCheckingOut}
            >
              <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
              Negociar via WhatsApp
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              Pagamento online processado com segurança pela InfinitePay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
