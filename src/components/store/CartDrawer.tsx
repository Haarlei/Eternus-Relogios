import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, X, Package } from "lucide-react";

export function CartDrawer() {
  const {
    items,
    removeItem,
    updateQuantity,
    totalItems,
    subtotal,
    desconto,
    totalPrice,
    cupomAplicado,
    isCartOpen,
    setIsCartOpen,
  } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate("/carrinho");
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] flex flex-col p-0 bg-background border-l border-border/50 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Sacola</h2>
              <p className="text-[11px] text-muted-foreground">
                {totalItems === 0 ? "Vazia" : `${totalItems} ${totalItems === 1 ? "item" : "itens"}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center px-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                <Package className="w-9 h-9 text-muted-foreground opacity-40" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Sacola vazia</p>
                <p className="text-sm text-muted-foreground">Explore nossa coleção e adicione produtos</p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl mt-2"
                onClick={() => { setIsCartOpen(false); navigate("/"); }}
              >
                Ver produtos
              </Button>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 items-start p-4 bg-card rounded-2xl border border-border/50 shadow-sm group hover:border-primary/20 transition-all duration-200"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 bg-muted rounded-xl overflow-hidden flex-shrink-0 border border-border/50">
                    {item.imagem_url ? (
                      <img src={item.imagem_url} alt={item.nome_produto} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold line-clamp-2 leading-snug">{item.nome_produto}</p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Qty control */}
                      <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-background rounded-md transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{item.quantidade}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-background rounded-md transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{formatCurrency(item.preco * item.quantidade)}</p>
                        {item.quantidade > 1 && (
                          <p className="text-[10px] text-muted-foreground">{formatCurrency(item.preco)} cada</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {items.length > 0 && (
          <div className="px-6 pt-4 pb-6 border-t border-border/50 bg-card space-y-4">
            {/* Summary row */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({totalItems} {totalItems === 1 ? "item" : "itens"})</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {cupomAplicado && (
                <div className="flex justify-between text-primary">
                  <span>Desconto ({cupomAplicado.codigo})</span>
                  <span>- {formatCurrency(desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span className="text-green-600 font-semibold">A calcular</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/40">
                <span className="font-bold text-base">Total</span>
                <span className="text-xl font-black text-primary">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {/* CTA */}
            <Button
              className="w-full h-13 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2"
              onClick={handleCheckout}
            >
              Finalizar Compra
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full h-10 rounded-2xl text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setIsCartOpen(false)}
            >
              Continuar comprando
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
