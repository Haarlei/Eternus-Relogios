import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Package, ShoppingCart, CreditCard, Users, Plus, Pencil, Trash2, DollarSign } from "lucide-react";

type Log = {
  id: string;
  user_id: string;
  editor_email: string | null;
  entidade: string;
  entidade_id: string | null;
  acao: string;
  descricao: string | null;
  detalhes: any;
  criado_em: string;
};

const entidadeIcons: Record<string, any> = {
  produto: Package,
  venda: ShoppingCart,
  parcela: CreditCard,
  devedor: Users,
};

const acaoConfig: Record<string, { label: string; icon: any; className: string }> = {
  criacao: { label: "Criação", icon: Plus, className: "badge-success border" },
  edicao: { label: "Edição", icon: Pencil, className: "badge-warning border" },
  exclusao: { label: "Exclusão", icon: Trash2, className: "badge-danger border" },
  pagamento: { label: "Pagamento", icon: DollarSign, className: "badge-success border" },
};

export default function Historico() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEntidade, setFiltroEntidade] = useState<string>("todos");
  const [filtroAcao, setFiltroAcao] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (user) loadLogs();
  }, [user]);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("logs_atividades")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(500);
    setLogs((data as Log[]) || []);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (filtroEntidade !== "todos" && l.entidade !== filtroEntidade) return false;
    if (filtroAcao !== "todas" && l.acao !== filtroAcao) return false;
    if (busca && !(l.descricao || "").toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Histórico de Atividades</h2>
          <p className="text-sm text-muted-foreground">Registro completo de tudo que acontece no sistema</p>
        </div>
        <Button variant="outline" onClick={loadLogs} disabled={loading}>
          {loading ? "Carregando..." : "Atualizar"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Buscar</Label>
            <Input
              placeholder="Buscar na descrição..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Entidade</Label>
            <Select value={filtroEntidade} onValueChange={setFiltroEntidade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="produto">Produtos</SelectItem>
                <SelectItem value="venda">Vendas</SelectItem>
                <SelectItem value="parcela">Parcelas</SelectItem>
                <SelectItem value="devedor">Devedores</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ação</Label>
            <Select value={filtroAcao} onValueChange={setFiltroAcao}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="criacao">Criação</SelectItem>
                <SelectItem value="edicao">Edição</SelectItem>
                <SelectItem value="exclusao">Exclusão</SelectItem>
                <SelectItem value="pagamento">Pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma atividade registrada</p>
          </div>
        )}

        {filtered.map(log => {
          const EntIcon = entidadeIcons[log.entidade] || History;
          const acao = acaoConfig[log.acao] || { label: log.acao, icon: History, className: "" };
          return (
            <Card key={log.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 rounded-md bg-muted">
                    <EntIcon className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={acao.className}>
                        <acao.icon className="w-3 h-3 mr-1" />
                        {acao.label}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">{log.entidade}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(log.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{log.descricao}</p>
                    {log.editor_email && (
                      <p className="text-xs text-muted-foreground mt-1">por {log.editor_email}</p>
                    )}
                    {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver detalhes
                        </summary>
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                          {Object.entries(log.detalhes).map(([k, v]: [string, any]) => (
                            <div key={k} className="flex gap-2">
                              <span className="font-medium capitalize">{k}:</span>
                              {v && typeof v === "object" && "antes" in v && "depois" in v ? (
                                <span>
                                  <span className="text-destructive line-through">{String(v.antes ?? "-")}</span>
                                  {" → "}
                                  <span className="text-success">{String(v.depois ?? "-")}</span>
                                </span>
                              ) : (
                                <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
