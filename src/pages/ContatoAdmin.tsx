import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, MailOpen, Trash2, Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Contato = Tables<"contatos">;

// Numero do WhatsApp da empresa (sem formatação, apenas dígitos)
const WHATSAPP_EMPRESA = "5585987939498"; // ← substitua pelo numero real

function buildWhatsAppUrl(contato: Contato): string {
  const numeroCliente = contato.telefone
    ? contato.telefone.replace(/\D/g, "")
    : null;

  // Se o cliente deixou telefone, redireciona direto para o número dele
  const numero = numeroCliente ? `55${numeroCliente}` : WHATSAPP_EMPRESA;

  const mensagem = encodeURIComponent(
    `Olá${contato.nome ? `, ${contato.nome}` : ""}! Tudo bem?\n\n` +
    `Sou da Eternus Relógios. Estou entrando em contato referente à sua mensagem:\n\n` +
    `"${contato.mensagem}"\n\n` +
    `Confirma que é você? 😊`
  );

  return `https://wa.me/${numero}?text=${mensagem}`;
}

export function useContatosNaoLidos() {
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
      .channel("contatos-nao-lidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "contatos" }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
}

export default function ContatoAdmin() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadContatos();
  }, []);

  async function loadContatos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setContatos(data || []);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar mensagens",
        description: "Não foi possível carregar as mensagens dos clientes.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function toggleLida(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from("contatos")
        .update({ lida: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setContatos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, lida: !currentStatus } : c))
      );

      toast({
        title: !currentStatus ? "Marcada como lida" : "Marcada como não lida",
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status da mensagem.",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir esta mensagem?")) return;

    try {
      const { error } = await supabase
        .from("contatos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setContatos((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Mensagem excluída" });
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a mensagem.",
      });
    }
  }

  const naoLidas = contatos.filter((c) => !c.lida).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Contato Cliente
            {naoLidas > 0 && (
              <Badge className="text-sm px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                {naoLidas} não {naoLidas === 1 ? "lida" : "lidas"}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as mensagens e dúvidas enviadas pelos clientes na loja.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10">Carregando mensagens...</div>
        ) : contatos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Mail className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma mensagem recebida</p>
              <p className="text-sm text-muted-foreground">
                Quando os clientes entrarem em contato, as mensagens aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          contatos.map((contato) => (
            <Card
              key={contato.id}
              className={contato.lida ? "opacity-75 bg-muted/30" : "border-l-4 border-l-primary"}
            >
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                    {contato.nome}
                    {!contato.lida && (
                      <Badge variant="default" className="text-xs">Novo</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-sm font-medium text-foreground/80">
                      <Mail className="h-3 w-3 shrink-0" /> {contato.email}
                    </span>
                    {contato.telefone && (
                      <span className="flex items-center gap-1 text-sm font-medium text-foreground/80">
                        <Phone className="h-3 w-3 shrink-0" /> {contato.telefone}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(contato.criado_em), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Botão WhatsApp */}
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                    title={
                      contato.telefone
                        ? `Responder via WhatsApp (${contato.telefone})`
                        : "Abrir WhatsApp da empresa"
                    }
                    className="text-green-600 border-green-600/40 hover:bg-green-600/10 hover:text-green-700"
                  >
                    <a
                      href={buildWhatsAppUrl(contato)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </Button>

                  {/* Marcar como lida/não lida */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleLida(contato.id, contato.lida)}
                    title={contato.lida ? "Marcar como não lida" : "Marcar como lida"}
                  >
                    {contato.lida ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                  </Button>

                  {/* Excluir */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(contato.id)}
                    title="Excluir mensagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <div className="bg-background rounded-md p-4 whitespace-pre-wrap text-sm border">
                  {contato.mensagem}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
