import { ReactNode, useState, useEffect } from "react";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = location.pathname === "/";
  const isCartPage = location.pathname === "/carrinho";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans-elegant">
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${isHome
          ? (scrolled 
              ? "bg-background/90 backdrop-blur-xl border-b border-border/50 py-4 shadow-lg shadow-black/5" 
              : "bg-transparent border-transparent py-6")
          : "bg-background/80 backdrop-blur-xl border-b border-border/30 py-4 shadow-sm"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          {/* Left side elements */}
          <div className="flex-1 hidden lg:flex items-center gap-10">
            <Link
              to="/"
              className={`text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:text-primary ${(isHome && !scrolled) ? "text-white/90" : "text-muted-foreground"
                }`}
            >
              Início
            </Link>
            <Link
              to="/colecao"
              className={`text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:text-primary ${(isHome && !scrolled) ? "text-white/90" : "text-muted-foreground"
                }`}
            >
              Coleção
            </Link>
            <FooterModal
              type="sobre"
              title="Sobre Nós"
              trigger={
                <button className={`text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:text-primary ${(isHome && !scrolled) ? "text-white/90" : "text-muted-foreground"
                  }`}>
                  A Marca
                </button>
              }
            />
          </div>

          {/* Logo Centralizado */}
          <Link to="/" className="flex flex-col items-center group">
            <span className={`text-2xl lg:text-3xl font-serif-elegant tracking-[0.5em] uppercase transition-colors duration-500 ${(isHome && !scrolled) ? "text-white" : "text-foreground"
              }`}>
              Eternus
            </span>
          </Link>

          {/* Right side elements */}
          <div className="flex-1 flex items-center justify-end gap-6">
            <div className="hidden lg:flex items-center gap-10 mr-4">
              <FooterModal
                type="faq"
                title="Ajuda"
                trigger={
                  <button className={`text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:text-primary ${(isHome && !scrolled) ? "text-white/90" : "text-muted-foreground"
                    }`}>
                    Suporte
                  </button>
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              {!isCartPage && (
                <button
                  className={`relative group p-2 transition-colors ${(isHome && !scrolled) ? "text-white hover:text-primary" : "text-foreground hover:text-primary"
                    }`}
                  onClick={() => navigate("/carrinho")}
                >
                  <ShoppingBag className="w-5 h-5 transition-transform group-hover:scale-110" strokeWidth={1.5} />
                  {totalItems > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-lg animate-scale-in">
                      {totalItems}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-[var(--header-offset,0)]">
        {children}
      </main>

      <footer className="bg-secondary/50 border-t border-border/30 pt-24 pb-12 mt-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-12 mb-20">
            {/* Logo e Info */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <span className="font-serif-elegant text-2xl tracking-[0.2em] uppercase text-foreground">Eternus</span>
                <div className="w-12 h-[2px] bg-primary" />
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs font-light">
                Curadoria exclusiva de alta relojoaria. Peças que transcendem o tempo com elegância e precisão inigualáveis.
              </p>
              <div className="flex items-center gap-6">
                <a href="#" className="text-muted-foreground hover:text-primary transition-all transform hover:scale-110">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://instagram.com/eternusrelogios" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-all transform hover:scale-110">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Menu Principal */}
            <div className="flex flex-col gap-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/80">Explorar</h3>
              <ul className="flex flex-col gap-4">
                <li><FooterModal type="pesquisar" title="Pesquisar" trigger={<button className="text-[13px] text-muted-foreground hover:text-primary transition-colors font-light">Buscar Produto</button>} /></li>
                <li><FooterModal type="sobre" title="Sobre Nós" trigger={<button className="text-[13px] text-muted-foreground hover:text-primary transition-colors font-light">A Nossa História</button>} /></li>
                <li><FooterModal type="faq" title="Perguntas Frequentes" trigger={<button className="text-[13px] text-muted-foreground hover:text-primary transition-colors font-light">Dúvidas Frequentes</button>} /></li>
                <li><FooterModal type="confiavel" title="Eternus Relógios é confiável?" trigger={<button className="text-[13px] text-muted-foreground hover:text-primary transition-colors font-light">Certificações</button>} /></li>
              </ul>
            </div>

            {/* Políticas e Ajuda */}
            <div className="flex flex-col gap-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/80">Serviços</h3>
              <ul className="flex flex-col gap-4">
                <li><FooterModal type="contato" title="Entrar em contato" trigger={<button className="text-[13px] text-muted-foreground hover:text-primary transition-colors font-light">Atendimento VIP</button>} /></li>
                <li><FooterModal type="pagamento" title="Métodos de Pagamento" trigger={<button className="text-[13px] text-muted-foreground hover:text-primary transition-colors font-light">Formas de Pagamento</button>} /></li>
                <li><FooterModal type="trocas" title="Trocas e Devoluções" trigger={<button className="text-[13px] text-muted-foreground hover:text-primary transition-colors font-light">Trocas e Devoluções</button>} /></li>
                <li><FooterModal type="politicas" title="Políticas de Privacidade" trigger={<button className="text-[13px] text-muted-foreground hover:text-primary transition-colors font-light">Privacidade</button>} /></li>
              </ul>
            </div>

            {/* Atendimento */}
            <div className="flex flex-col gap-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/80">Concierge</h3>
              <div className="flex flex-col gap-6">
                <p className="text-[13px] text-muted-foreground italic font-light">Estamos à disposição para uma experiência personalizada.</p>
                <div className="flex flex-col gap-4">
                  <a href="https://wa.me/5585987939498" target="_blank" rel="noreferrer" className="group flex items-center gap-4 text-[13px] font-medium text-foreground hover:text-primary transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-all border border-primary/10">
                      <MessageCircle className="w-4 h-4 text-primary" />
                    </div>
                    WhatsApp Business
                  </a>
                  <a href="mailto:eternusrelogios@gmail.com" className="group flex items-center gap-4 text-[13px] font-medium text-foreground hover:text-primary transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-all border border-primary/10">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    Email Concierge
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-border/10 flex flex-col md:flex-row items-center justify-between gap-8">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-light">
              &copy; {new Date().getFullYear()} Eternus Relógios. Excellence in Horology.
            </p>
            <div className="flex items-center gap-10 grayscale opacity-40 hover:opacity-80 transition-all duration-500">
              <img src="https://vignette.wikia.nocookie.net/logopedia/images/5/5e/Visa_Inc._logo.svg/revision/latest/scale-to-width-down/300?cb=20150508182747" alt="Visa" className="h-4" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Pix_logo.svg" alt="PIX" className="h-5" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
