import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Home, LayoutDashboard, Package, ShoppingCart, Users, LogOut, Watch, Menu, X, History, MessageCircle, UserSearch, Settings, Star, ClipboardList, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/dashboard/estatisticas", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/pedidos", label: "Pedidos do Site", icon: ClipboardList },
  { to: "/devedores", label: "Devedores", icon: Users },
  { to: "/clientes", label: "Clientes", icon: UserSearch },
  { to: "/usuarios", label: "Usuários Registrados", icon: UserCheck },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/dashboard/contato", label: "Contato Cliente", icon: MessageCircle, badge: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/avaliacoes", label: "Avaliações", icon: Star },
];

// Itens que aparecem na bottom nav mobile (os mais usados)
const bottomNavItems = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
];

function useContatosNaoLidos() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetch() {
      const { count: c } = await supabase
        .from("contatos")
        .select("*", { count: "exact", head: true })
        .eq("lida", false);
      setCount(c ?? 0);
    }
    fetch();

    const channel = supabase
      .channel("layout-contatos-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "contatos" }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
}

const playChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A5 to A6 sweep
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1);
  } catch (e) {
    console.error("Erro ao reproduzir som de notificação", e);
  }
};

function useNotificacoesPedidos() {
  useEffect(() => {
    const channel = supabase
      .channel("layout-pedidos-notificacao")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos" }, (payload) => {
        const id = payload.new.id.slice(0, 8).toUpperCase();
        playChime();
        toast(`🚨 Novo pedido recebido!`, {
          description: `O pedido #${id} acabou de ser criado no site.`,
          action: {
            label: "Ver Pedido",
            onClick: () => {
              window.location.href = "/pedidos";
            }
          },
          duration: 10000,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const naoLidas = useContatosNaoLidos();
  useNotificacoesPedidos();

  const currentLabel = navItems.find(n => n.to === location.pathname)?.label || "Eternus Admin";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shadow-xl lg:shadow-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center">
            <Watch className="w-5 h-5 text-sidebar-primary" />
          </div>
          <span className="text-base font-bold text-sidebar-foreground truncate">Eternus Admin</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items — scrollable */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, badge }) => {
            const isActive = location.pathname === to;
            const showBadge = badge && naoLidas > 0;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "sidebar-link",
                  isActive ? "sidebar-link-active" : "sidebar-link-inactive"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-sm">{label}</span>
                {showBadge && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold leading-none">
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 pb-4 border-t border-sidebar-border pt-3 flex-shrink-0">
          <p className="text-xs text-sidebar-foreground/50 px-3 mb-2 truncate">{user?.email}</p>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-sm h-9"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-14 border-b border-border flex items-center px-4 bg-card sticky top-0 z-30 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 p-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-sm font-semibold text-foreground truncate flex-1 pr-2">
            {currentLabel}
          </h1>
          <div className="flex items-center gap-2">
            {naoLidas > 0 && (
              <Link to="/dashboard/contato" className="relative p-2 rounded-xl hover:bg-muted transition-colors">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              </Link>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 md:p-6 overflow-x-hidden overflow-y-auto pb-20 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border safe-area-pb">
          <div className="flex items-stretch h-14">
            {bottomNavItems.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                  <span className="leading-none">{label}</span>
                </Link>
              );
            })}
            {/* "Mais" button to open full sidebar */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
              <span className="leading-none">Mais</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
