import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Watch, Facebook, Instagram, MessageCircle, Mail } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "../image/eternus.png"; // ajuste o caminho conforme sua estrutura
import { FooterModal } from "./store/FooterModals";

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
            <div className="hidden md:flex items-center gap-6 mr-4">
              <FooterModal type="sobre" title="Sobre Nós" trigger={<button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sobre</button>} />
              <FooterModal type="faq" title="Perguntas Frequentes" trigger={<button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</button>} />
            </div>
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

      <footer className="border-t border-border/40 bg-card py-12 mt-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo e Info */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-12 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-md border border-border">
                <img src={logo} alt="Logo Eternus" className="w-full h-full object-contain bg-gray-900" />
              </div>
              <span className="font-bold tracking-tight text-lg">Eternus Relógios</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Relógios premium originais com entrega rápida e garantia de qualidade para todo o Brasil.
            </p>
          </div>

          {/* Menu Principal */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-foreground mb-1">Menu</h3>
            <FooterModal type="pesquisar" title="Pesquisar" trigger={<button className="text-sm text-left text-muted-foreground hover:text-primary transition-colors">Pesquisar</button>} />
            <FooterModal type="sobre" title="Sobre Nós" trigger={<button className="text-sm text-left text-muted-foreground hover:text-primary transition-colors">Sobre Nós</button>} />
            <FooterModal type="faq" title="Perguntas Frequentes" trigger={<button className="text-sm text-left text-muted-foreground hover:text-primary transition-colors">Perguntas Frequentes</button>} />
            <FooterModal type="confiavel" title="Eternus Relógios é confiável?" trigger={<button className="text-sm text-left text-muted-foreground hover:text-primary transition-colors">Eternus Relógios é confiável?</button>} />
          </div>

          {/* Políticas e Ajuda */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-foreground mb-1">Ajuda e Políticas</h3>
            <FooterModal type="contato" title="Entrar em contato" trigger={<button className="text-sm text-left text-muted-foreground hover:text-primary transition-colors">Entrar em contato</button>} />
            <FooterModal type="pagamento" title="Métodos de Pagamento" trigger={<button className="text-sm text-left text-muted-foreground hover:text-primary transition-colors">Métodos de Pagamento</button>} />
            <FooterModal type="trocas" title="Trocas e Devoluções" trigger={<button className="text-sm text-left text-muted-foreground hover:text-primary transition-colors">Trocas e Devoluções</button>} />
            <FooterModal type="politicas" title="Políticas de Privacidade" trigger={<button className="text-sm text-left text-muted-foreground hover:text-primary transition-colors">Políticas de Privacidade</button>} />
          </div>

          {/* Contato e Redes */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-foreground mb-1">Atendimento</h3>
            <p className="text-sm text-muted-foreground">Seg a Sex: 09:00 às 18:00</p>
            <a href="https://wa.me/5585987939498" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-green-500 transition-colors flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <a
              href="mailto:eternusrelogios@gmail.com?subject=Atendimento Eternus Relógios&body=Olá, gostaria de mais informações sobre um produto."
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Mail className="w-4 h-4" /> Email
            </a>

            <h3 className="font-semibold text-foreground mt-2">Redes Sociais</h3>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-blue-600 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/eternusrelogios" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-pink-600 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-full cursor-not-allowed border border-border/50">
                TikTok em breve
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Eternus Relógios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
