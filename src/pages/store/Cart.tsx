import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus, ShoppingBag, MessageCircle, ArrowLeft } from "lucide-react";

const WHATSAPP = "5585987939498";

export default function Cart() {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const handleCheckoutWhatsApp = () => {
    let message = "Olá! Gostaria de finalizar a compra dos seguintes itens:\n\n";
    
    items.forEach((item, index) => {
      message += `${index + 1}. *${item.nome_produto}*\n   Qtd: ${item.quantidade}x ${formatCurrency(item.preco)}\n`;
    });

    message += `\n*Total estimado:* ${formatCurrency(totalPrice)}\n\nQuais são as opções de pagamento e envio?`;

    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
    
    // Opcional: limpar carrinho após enviar pro wpp
    // clearCart();
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
                <span>A calcular no WhatsApp</span>
              </div>
              
              <div className="border-t border-border pt-4 flex justify-between font-bold text-lg text-foreground">
                <span>Total Estimado</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-base font-semibold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_var(--primary)]/30 hover:shadow-[0_0_30px_var(--primary)]/50 transition-all hover:-translate-y-1"
              onClick={handleCheckoutWhatsApp}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Finalizar no WhatsApp
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Você será redirecionado para o nosso WhatsApp com a lista de produtos para finalizar a compra de forma segura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
