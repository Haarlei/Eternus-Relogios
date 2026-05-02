import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

// Tipo local com apenas os campos públicos necessários para a busca da vitrine
type ProdutoPublico = {
  id: string;
  nome_produto: string;
  genero: string | null;
  imagem_url: string | null;
  preco_com_margem: number;
  estoque_atual: number;
};
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FooterModalProps {
  trigger: React.ReactNode;
  title: string;
  type: "sobre" | "pagamento" | "contato" | "faq" | "confiavel" | "trocas" | "politicas" | "pesquisar";
}



function SearchContent({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProdutoPublico[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("produtos")
      .select("id, nome_produto, genero, imagem_url, preco_com_margem, estoque_atual")
      .ilike("nome_produto", `%${q}%`)
      .gt("estoque_atual", 0)
      .order("nome_produto");
    setResults((data as ProdutoPublico[]) || []);
    setSearched(true);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome do relógio..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {searching && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">Buscando...</p>
      )}

      {!searching && searched && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">Nenhum relógio encontrado para "{query}".</p>
      )}

      {!searching && results.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {results.map((p) => {
            const preco = p.preco_com_margem;
            return (
              <Link
                key={p.id}
                to={`/produto/${p.id}`}
                onClick={onClose}
                className="group flex flex-col rounded-xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-md transition-all bg-card"
              >
                <div className="aspect-square bg-muted overflow-hidden flex items-center justify-center">
                  {p.imagem_url ? (
                    <img src={p.imagem_url} alt={p.nome_produto} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem imagem</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.genero}</p>
                  <p className="text-xs font-semibold line-clamp-1">{p.nome_produto}</p>
                  <p className="text-sm font-bold text-primary mt-1">{formatCurrency(preco)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!query && !searching && (
        <p className="text-center text-sm text-muted-foreground py-4">Digite acima para buscar um relógio pelo nome.</p>
      )}
    </div>
  );
}

export function FooterModal({ trigger, title, type }: FooterModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmitContato = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nome = formData.get("nome") as string;
    const email = formData.get("email") as string;
    const telefone = (formData.get("telefone") as string) || null;
    const mensagem = formData.get("mensagem") as string;

    try {
      const { error } = await supabase.from("contatos").insert([{ nome, email, telefone, mensagem }]);

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Agradecemos o contato. Retornaremos em breve.",
      });
      setOpen(false);
    } catch (error) {
      console.error("Erro ao enviar contato:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: "Não foi possível enviar sua mensagem. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (type) {
      case "sobre":
        return (
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Olá prezado amigo(a), queremos te agradecer por estar aqui conhecendo nossa loja Online.
            </p>
            <p>
              A Eternus Relogios é uma pequena loja dedicada à comercialização de relógios importados, com atuação inicial no <strong>Ceará</strong> e plano de expansão para todo o <strong>Brasil</strong>. Nosso objetivo é consolidar presença no mercado de relojoaria oferecendo uma proposta simples: alta qualidade com preços competitivos.
            </p>
            <p>
              Mantemos relacionamento direto com fabricantes internacionais, o que nos permite reduzir intermediários e repassar melhores condições ao cliente. Trabalhamos apenas com produtos que atendem critérios de qualidade, confiabilidade e procedência.
            </p>
            <p>
              Nossa operação é orientada pelo cliente. Priorizamos atendimento claro, prazos consistentes e comunicação transparente. Honestidade e consistência são pilares operacionais — não como discurso, mas como prática diária. Qualquer dúvida entre em contato conosco pelo email: <strong>eternusrelogios@gmail.com</strong>
            </p>
            <p>
              Se a proposta é adquirir um relógio com bom custo-benefício e segurança, essa é a base do que entregamos.
            </p>
            <p>Teremos muito prazer em lhe atender e ajudar.</p>
            <p>Um abraço, equipe Eternus Relogios</p>
          </div>
        );
      case "pagamento":
        return (
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <h4 className="font-semibold text-foreground italic">
              Quais meios de pagamento são suportados pela Eternus Relógios?
            </h4>

            <p>
              Buscamos oferecer uma experiência de compra simples, direta e segura para nossos clientes, com um processo transparente do início ao fim.
            </p>

            <div>
              <p className="font-medium text-foreground mb-1">Formas de pagamento aceitas:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Pix</li>
                <li>Cartão de crédito e débito (todas as principais bandeiras)</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">Como funciona o pagamento online:</p>
              <p>
                Após a confirmação do seu pedido, um <strong>link de pagamento</strong> será enviado diretamente para o seu WhatsApp.
                Por meio desse link, você poderá concluir o pagamento de forma prática e segura.
              </p>
              <p className="mt-2">
                Após a confirmação do pagamento, seu produto será separado, embalado e encaminhado para entrega.
              </p>
            </div>

            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive font-bold mb-1">ATENÇÃO:</p>
              <p className="text-xs">
                Nossos colaboradores <strong>NUNCA</strong> irão solicitar senhas, códigos de verificação ou qualquer informação sensível relacionada a pagamentos.
                Caso alguém entre em contato se passando pela nossa loja pedindo esse tipo de dado, desconsidere imediatamente e informe através do e-mail:{" "}
                <strong>eternusrelogios@gmail.com</strong>
              </p>
            </div>
          </div>
        );
      case "contato":
        return (
          <form onSubmit={handleSubmitContato} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Input name="nome" placeholder="Seu nome completo" required />
            </div>
            <div className="space-y-2">
              <Input name="email" type="email" placeholder="Seu melhor e-mail" required />
            </div>
            <div className="space-y-2">
              <Input
                name="telefone"
                type="tel"
                placeholder="Seu WhatsApp / telefone (ex: 85 9 9999-9999)"
              />
            </div>
            <div className="space-y-2">
              <Textarea name="mensagem" placeholder="Como podemos ajudar?" className="min-h-[100px]" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Mensagem"}
            </Button>
          </form>
        );
      case "faq":
        return (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-sm font-semibold text-left">
                O SITE É CONFIÁVEL?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Somos uma empresa em fase inicial no ambiente digital, com atuação focada em transparência e consistência operacional desde o primeiro contato. Trabalhamos com fornecedores internacionais selecionados e adotamos critérios de qualidade, procedência e verificação antes de disponibilizar qualquer produto. não deixe de entrar em contato:{" "}
                <strong>eternusrelogios@gmail.com</strong>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-sm font-semibold text-left">
                COMO É FEITO A COMPRA?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                O processo é simples: você escolhe o relógio desejado, adiciona ao carrinho, preenche suas informações de entrega e realiza o pagamento de forma segura através da plataforma. Trabalhamos com sistema integrado que过程a pedidos de modo claro, com rastreamento e atualizações sobre o status do envio.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-sm font-semibold text-left">
                QUAL A GARANTIA DOS PRODUTOS?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Todos os relógios comercializados possuem garantia de 1 ANO contra defeitos de fabricação, a partir da data de compra. Caso identifique qualquer defeito, entre em contato conosco pelo email: {" "}
                <strong>eternusrelogios@gmail.com</strong>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      case "pesquisar":
        return <SearchContent onClose={() => setOpen(false)} />;
      default:
        return (
          <div className="py-8 text-center text-muted-foreground italic">
            <p>
              Olá prezado amigo(a), queremos te agradecer por estar aqui conhecendo nossa loja Online.
            </p>
            <p>
              A Eternus Relogios é uma pequena loja dedicada à comercialização de relógios importados, com atuação inicial no <strong>Ceará</strong> e plano de expansão para todo o <strong>Brasil</strong>. Nosso objetivo é consolidar presença no mercado de relojoaria oferecendo uma proposta simples: alta qualidade com preços competitivos.
            </p>
            <p>
              Mantemos relacionamento direto com fabricantes internacionais, o que nos permite reduzir intermediários e repassar melhores condições ao cliente. Trabalhamos apenas com produtos que atendem critérios de qualidade, confiabilidade e procedência.
            </p>
            <p>
              Nossa operação é orientada pelo cliente. Priorizamos atendimento claro, prazos consistentes e comunicação transparente. Honestidade e consistência são pilares operacionais — não como discurso, mas como prática diária. Qualquer dúvida entre em contato conosco pelo email: <strong>eternusrelogios@gmail.com</strong>
            </p>
            <p>
              Se a proposta é adquirir um relógio com bom custo-benefício e segurança, essa é a base do que entregamos.
            </p>
            <p>Teremos muito prazer em lhe atender e ajudar.</p>
            <p>Um abraço, equipe Eternus Relogios</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {type === "contato" ? "Preencha o formulário abaixo para nos enviar uma mensagem."
              : type === "pesquisar" ? "Encontre relógios pelo nome. Clique em um resultado para ver os detalhes."
                : "Informações institucionais da Eternus Relógios."}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
