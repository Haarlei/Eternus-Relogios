import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Produtos from "@/pages/Produtos";
import Vendas from "@/pages/Vendas";
import Devedores from "@/pages/Devedores";
import Historico from "@/pages/Historico";
import Links from "@/pages/Links";
import ContatoAdmin from "@/pages/ContatoAdmin";
import NotFound from "./pages/NotFound";

import { CartProvider } from "@/contexts/CartContext";
import StoreLayout from "@/components/StoreLayout";
import StoreHome from "@/pages/store/Home";
import ProductDetail from "@/pages/store/ProductDetail";
import Cart from "@/pages/store/Cart";
import { ThemeProvider } from "@/components/ThemeProvider";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/devedores" element={<Devedores />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/dashboard/contato" element={<ContatoAdmin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CartProvider>
          <ThemeProvider defaultTheme="system" storageKey="eternus-theme">
            <BrowserRouter>
              <Routes>
                <Route path="/links" element={<Links />} />

                {/* Rotas da Loja Virtual */}
                <Route path="/" element={<StoreLayout><StoreHome /></StoreLayout>} />
                <Route path="/produto/:id" element={<StoreLayout><ProductDetail /></StoreLayout>} />
                <Route path="/carrinho" element={<StoreLayout><Cart /></StoreLayout>} />

                {/* Rotas Protegidas (Painel Admin) */}
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
            </BrowserRouter>
          </ThemeProvider>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
