import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  id: string;
  sku?: string;
  nome_produto: string;
  preco: number;
  imagem_url: string | null;
  quantidade: number;
  estoque_disponivel: number;
}

export interface Cupom {
  id: string;
  codigo: string;
  tipo: "percentual" | "fixo";
  valor: number;
  ativo: boolean;
}

interface CartContextData {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantidade: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  desconto: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cupomAplicado: Cupom | null;
  applyCupom: (codigo: string) => Promise<boolean>;
  removeCupom: () => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("@EternusStore:cart");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cupomAplicado, setCupomAplicado] = useState<Cupom | null>(() => {
    const saved = localStorage.getItem("@EternusStore:cupom");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem("@EternusStore:cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (cupomAplicado) {
      localStorage.setItem("@EternusStore:cupom", JSON.stringify(cupomAplicado));
    } else {
      localStorage.removeItem("@EternusStore:cupom");
    }
  }, [cupomAplicado]);

  const addItem = (newItem: CartItem) => {
    setItems((current) => {
      const existing = current.find((i) => i.id === newItem.id);
      if (existing) {
        if (existing.quantidade + newItem.quantidade > newItem.estoque_disponivel) {
          toast.error("Quantidade máxima em estoque atingida!");
          return current;
        }
        toast.success("Quantidade atualizada no carrinho!");
        return current.map((i) =>
          i.id === newItem.id ? { ...i, quantidade: i.quantidade + newItem.quantidade } : i
        );
      }
      toast.success("Produto adicionado ao carrinho!");
      return [...current, newItem];
    });
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((i) => i.id !== id));
    toast.success("Produto removido do carrinho");
  };

  const updateQuantity = (id: string, quantidade: number) => {
    if (quantidade <= 0) {
      removeItem(id);
      return;
    }
    setItems((current) =>
      current.map((i) => {
        if (i.id === id) {
          if (quantidade > i.estoque_disponivel) {
            toast.error("Quantidade máxima em estoque atingida!");
            return i;
          }
          return { ...i, quantidade };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantidade, 0);
  const subtotal = items.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  let desconto = 0;
  if (cupomAplicado) {
    if (cupomAplicado.tipo === "percentual") {
      desconto = subtotal * (cupomAplicado.valor / 100);
    } else {
      desconto = cupomAplicado.valor;
    }
    // Prevent negative total
    if (desconto > subtotal) desconto = subtotal;
  }

  const totalPrice = subtotal - desconto;

  const applyCupom = async (codigo: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "cupons")
        .single();
        
      if (error || !data) {
        toast.error("Cupom inválido ou expirado.");
        return false;
      }
      
      const cupons: Cupom[] = JSON.parse(data.valor);
      const cupom = cupons.find(c => c.codigo.toUpperCase() === codigo.toUpperCase());
      
      if (!cupom || !cupom.ativo) {
        toast.error("Cupom inválido ou expirado.");
        return false;
      }
      
      setCupomAplicado(cupom);
      toast.success(`Cupom ${cupom.codigo} aplicado com sucesso!`);
      return true;
    } catch (e) {
      toast.error("Erro ao validar cupom.");
      return false;
    }
  };

  const removeCupom = () => {
    setCupomAplicado(null);
    toast.success("Cupom removido.");
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        desconto,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
        cupomAplicado,
        applyCupom,
        removeCupom
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
