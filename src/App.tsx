import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Produtos from "@/pages/Produtos";
import Vendas from "@/pages/Vendas";
import Devedores from "@/pages/Devedores";
import Clientes from "@/pages/Clientes";
import Configuracoes from "@/pages/Configuracoes";
import Historico from "@/pages/Historico";
import Links from "@/pages/Links";
import ContatoAdmin from "@/pages/ContatoAdmin";
import Avaliacoes from "@/pages/Avaliacoes";
import PedidosAdmin from "@/pages/PedidosAdmin";
import UsuariosRegistrados from "@/pages/UsuariosRegistrados";
import AdminHome from "@/pages/AdminHome";
import NotFound from "./pages/NotFound";
import { Navigate } from "react-router-dom";

import { CartProvider } from "@/contexts/CartContext";
import StoreLayout from "@/components/StoreLayout";
import StoreHome from "@/pages/store/Home";
import ProductDetail from "@/pages/store/ProductDetail";
import Catalog from "@/pages/store/Catalog";
import Cart from "@/pages/store/Cart";
import PagamentoConcluido from "@/pages/store/PagamentoConcluido";
import StoreLogin from "@/pages/store/StoreLogin";
import MinhaConta from "@/pages/store/MinhaConta";
import VerifyEmail from "@/pages/store/VerifyEmail";
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

  if (!user) return <Navigate to="/entrar" replace />;
  if (!user.is_admin) return <Navigate to="/minha-conta" replace />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<AdminHome />} />
        <Route path="/dashboard/estatisticas" element={<Dashboard />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/devedores" element={<Devedores />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/dashboard/contato" element={<ContatoAdmin />} />
        <Route path="/avaliacoes" element={<Avaliacoes />} />
        <Route path="/pedidos" element={<PedidosAdmin />} />
        <Route path="/usuarios" element={<UsuariosRegistrados />} />
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
                <Route path="/auth" element={<Navigate to="/entrar" replace />} />
                <Route path="/links" element={<Links />} />

                {/* Rotas da Loja Virtual (Públicas) */}
                <Route path="/" element={<StoreLayout><StoreHome /></StoreLayout>} />
                <Route path="/colecao" element={<StoreLayout><Catalog /></StoreLayout>} />
                <Route path="/produto/:id" element={<StoreLayout><ProductDetail /></StoreLayout>} />
                <Route path="/carrinho" element={<StoreLayout><Cart /></StoreLayout>} />
                <Route path="/pagamento-concluido" element={<StoreLayout><PagamentoConcluido /></StoreLayout>} />
                <Route path="/entrar" element={<StoreLayout><StoreLogin /></StoreLayout>} />
                <Route path="/minha-conta" element={<StoreLayout><MinhaConta /></StoreLayout>} />
                <Route path="/verificar-email" element={<StoreLayout><VerifyEmail /></StoreLayout>} />

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
