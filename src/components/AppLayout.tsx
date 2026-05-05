import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Package, ShoppingCart, Users, LogOut, Watch, Menu, X, History, MessageCircle, UserSearch, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/devedores", label: "Devedores", icon: Users },
  { to: "/clientes", label: "Clientes", icon: UserSearch },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/dashboard/contato", label: "Contato Cliente", icon: MessageCircle, badge: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
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

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const naoLidas = useContatosNaoLidos();

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-gray-500 flex items-center justify-center">
            <Watch className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">Eternus Relogios</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
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
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold leading-none">
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-sidebar-border pt-4">
          <p className="text-xs text-sidebar-foreground/50 px-3 mb-2 truncate">{user?.email}</p>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-6 bg-card justify-between">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-3">
              <Menu className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">
              {navItems.find(n => n.to === location.pathname)?.label || "Eternus Admin"}
            </h1>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
