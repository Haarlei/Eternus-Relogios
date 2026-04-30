import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  nome_produto: string;
  preco: number;
  imagem_url: string | null;
  quantidade: number;
  estoque_disponivel: number;
}

interface CartContextData {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantidade: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
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

  useEffect(() => {
    localStorage.setItem("@EternusStore:cart", JSON.stringify(items));
  }, [items]);

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
  const totalPrice = items.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
