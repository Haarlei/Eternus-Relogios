import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Watch } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "../image/eternus.png"; // ajuste o caminho conforme sua estrutura

export default function StoreLayout({ children }: { children: ReactNode }) {
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const isCartPage = location.pathname === "/carrinho";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {/* <div className="w-10 h-10 rounded-xl bg-gray-500 flex items-center justify-center">
              <Watch className="w-6 h-6 text-white" />
            </div> */}
            <div className="w-14 h-11 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl border border-border">
              <img
                src={logo}
                alt="Logo Eternus Relógios"
                className="w-full h-full object-contain bg-gray-900"
              />
            </div>
            <span className="text-xl font-bold tracking-tight">Eternus Relógios</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {!isCartPage && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate("/carrinho")}
              >
                <ShoppingBag className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                    {totalItems}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-card py-8 mt-12">
        <div className="container mx-auto px-4 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-500 flex items-center justify-center mb-2 opacity-50">
            <Watch className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Relógios premium originais com entrega rápida e garantia de qualidade para todo o Brasil.
          </p>
          <div className="flex gap-4 mt-4">
            <Link to="/links" className="text-sm font-medium hover:text-green-500 transition-colors">
              Nossos Links
            </Link>
            <a href="https://instagram.com/eternusrelogios" target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-green-500 transition-colors">
              Instagram
            </a>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-4">
            &copy; {new Date().getFullYear()} Eternus Relógios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
