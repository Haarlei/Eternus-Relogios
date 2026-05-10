import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ShoppingBag, Phone, Mail, Calendar } from "lucide-react";
import { maskPhone } from "@/lib/masks";

interface UsuarioRegistrado {
  id: string;
  nome: string;
  telefone: string | null;
  criado_em: string;
  total_pedidos: number;
}

export default function UsuariosRegistrados() {
  const [usuarios, setUsuarios] = useState<UsuarioRegistrado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);

    // Fetch perfis with only needed columns
    const { data: perfis, error } = await supabase
      .from("perfis")
      .select("id, nome, telefone, criado_em")
      .order("criado_em", { ascending: false });

    if (error || !perfis) {
      setLoading(false);
      return;
    }

    // Fetch order counts per user — only 2 fields needed
    const { data: pedidosCounts } = await supabase
      .from("pedidos")
      .select("user_id, id");

    const countMap: Record<string, number> = {};
    if (pedidosCounts) {
      for (const p of pedidosCounts) {
        countMap[p.user_id] = (countMap[p.user_id] || 0) + 1;
      }
    }

    setUsuarios(perfis.map(u => ({
      ...u,
      total_pedidos: countMap[u.id] || 0,
    })));
    setLoading(false);
  };

  const filtered = usuarios.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    (u.telefone || "").includes(search)
  );

  const stats = {
    total: usuarios.length,
    comPedidos: usuarios.filter(u => u.total_pedidos > 0).length,
    novosEsteMes: usuarios.filter(u => {
      const d = new Date(u.criado_em);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Usuários Registrados</h2>
        <p className="text-sm text-muted-foreground">Clientes que criaram conta na loja virtual.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de Usuários</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Com Pedidos</p>
            <p className="text-2xl font-bold mt-1 text-primary">{stats.comPedidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Novos Este Mês</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.novosEsteMes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Cliente</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">WhatsApp</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Membro desde</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Pedidos</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">Carregando usuários...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : filtered.map(usuario => (
                <tr key={usuario.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {usuario.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{usuario.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono">{usuario.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {usuario.telefone ? (
                      <a
                        href={`https://wa.me/55${usuario.telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline text-sm"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {maskPhone(usuario.telefone)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">Não informado</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(usuario.criado_em)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                      usuario.total_pedidos > 0
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      <ShoppingBag className="w-3 h-3" />
                      {usuario.total_pedidos} {usuario.total_pedidos === 1 ? "pedido" : "pedidos"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
