import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserSearch, Plus, Phone, MessageCircle, Trash2, Search, Watch } from "lucide-react";
import { maskPhone, unmaskValue } from "@/lib/masks";
import type { Tables } from "@/integrations/supabase/types";

type Cliente = Tables<"clientes"> & {
  produtos?: { nome_produto: string } | null;
};

export default function Clientes() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "" });

  useEffect(() => {
    if (user) loadClientes();
  }, [user]);

  const loadClientes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clientes")
      .select("*, produtos(nome_produto)")
      .order("ultima_compra", { ascending: false });
    setClientes((data as Cliente[]) || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.nome.trim()) return toast.error("Nome é obrigatório");

    const { error } = await supabase.from("clientes").insert({
      user_id: user.id,
      nome: form.nome,
      telefone: unmaskValue(form.telefone) || null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Cliente cadastrado!");
      setOpen(false);
      setForm({ nome: "", telefone: "" });
      loadClientes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Cliente removido");
      loadClientes();
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) || 
    (c.telefone && c.telefone.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gestão de Clientes</h2>
          <p className="text-sm text-muted-foreground">Visualize e gerencie sua base de clientes.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input 
                  value={form.nome} 
                  onChange={e => setForm({...form, nome: e.target.value})} 
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone / WhatsApp</Label>
                <Input 
                  value={form.telefone} 
                  onChange={e => setForm({...form, telefone: maskPhone(e.target.value)})} 
                  placeholder="(00) 00000-0000"
                />
              </div>
              <Button type="submit" className="w-full">Salvar Cliente</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar por nome ou telefone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">Cliente</th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">WhatsApp</th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">Último Relógio</th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">Última Compra</th>
                  <th className="text-right py-3 px-3 text-muted-foreground font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map(cliente => (
                  <tr key={cliente.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-medium text-foreground">{cliente.nome}</div>
                    </td>
                    <td className="py-3 px-3">
                      {cliente.telefone ? (
                        <a 
                          href={`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline font-medium"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {maskPhone(cliente.telefone)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">---</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {cliente.produtos ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Watch className="w-3.5 h-3.5" />
                          {cliente.produtos.nome_produto}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Nenhuma compra registrada</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {cliente.ultima_compra ? formatDate(cliente.ultima_compra) : "---"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(cliente.id)}
                        className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredClientes.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                      <UserSearch className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
