import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Truck, MessageCircle, ShoppingCart, ArrowLeft, CheckCircle2, Watch } from "lucide-react";
import { toast } from "sonner";

// Tipo local com apenas os campos públicos necessários para a página de detalhe
type Produto = {
  id: string;
  nome_produto: string;
  descricao: string | null;
  genero: string | null;
  imagem_url: string | null;
  galeria_imagens: string[] | null;
  especificacoes: Record<string, unknown> | null;
  preco_com_margem: number;
  estoque_atual: number;
};

const WHATSAPP = "5585987939498";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Produto[]>([]);

  useEffect(() => {
    async function loadProduto() {
      if (!id) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome_produto, descricao, genero, imagem_url, galeria_imagens, especificacoes, preco_com_margem, estoque_atual")
        .eq("id", id)
        .single();

      if (!error && data) {
        setProduto(data as Produto);
        setActiveImage(data.imagem_url || (data.galeria_imagens && data.galeria_imagens.length > 0 ? data.galeria_imagens[0] : null));
        
        // Carregar produtos relacionados de forma "inteligente"
        loadRelated(data as Produto);
      } else {
        setProduto(null);
      }
      setLoading(false);
    }

    async function loadRelated(current: Produto) {
      // Busca produtos do mesmo gênero, excluindo o atual
      const { data } = await supabase
        .from("produtos")
        .select("id, nome_produto, genero, imagem_url, preco_com_margem, estoque_atual, especificacoes")
        .eq("genero", current.genero)
        .neq("id", current.id)
        .limit(10);

      if (data) {
        // Filtra os que devem ser exibidos
        const visible = data.filter(p => (p.especificacoes as any)?.exibir_na_loja !== "Não");

        // Ordena por proximidade de preço para ser mais "inteligente" (sugestões de mesma categoria e valor próximo)
        const sorted = [...visible].sort((a, b) => {
          const diffA = Math.abs(a.preco_com_margem - current.preco_com_margem);
          const diffB = Math.abs(b.preco_com_margem - current.preco_com_margem);
          return diffA - diffB;
        });
        
        setRelatedProducts(sorted.slice(0, 4) as Produto[]);
      }
    }

    loadProduto();
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-16">
          <Skeleton className="w-full lg:w-1/2 aspect-square rounded-[2.5rem]" />
          <div className="w-full lg:w-1/2 space-y-8 pt-8">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-32 w-full mt-12" />
          </div>
        </div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-serif-elegant mb-6">Produto não encontrado</h2>
        <Button onClick={() => navigate("/")} className="rounded-full px-8">Voltar para a loja</Button>
      </div>
    );
  }

  const preco = produto.preco_com_margem;
  const esgotado = produto.estoque_atual <= 0;

  const allImages = [];
  if (produto.imagem_url) allImages.push(produto.imagem_url);
  if (produto.galeria_imagens) allImages.push(...produto.galeria_imagens);
  const uniqueImages = Array.from(new Set(allImages));

  const specs = (produto.especificacoes as Record<string, string>) || {};

  const buyDirectlyWhatsApp = () => {
    const text = `Olá! Tenho interesse no relógio *${produto.nome_produto}*.\nValor: *${formatCurrency(preco)}*.\n\nPode me enviar mais detalhes e opções de pagamento?`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleAddToCart = () => {
    addItem({
      id: produto.id,
      nome_produto: produto.nome_produto,
      preco: preco,
      imagem_url: produto.imagem_url,
      quantidade: 1,
      estoque_disponivel: produto.estoque_atual,
    });
    toast.success("Adicionado à sacola!");
  };

  return (
    <div className="container mx-auto px-4 py-8 lg:py-20 max-w-7xl font-sans-elegant">
      <button onClick={() => navigate(-1)} className="group flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all mb-12">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Voltar para a Coleção
      </button>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12 lg:gap-24 items-start mb-32">
        {/* Imagens */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          <div className="relative aspect-square bg-card rounded-[2.5rem] overflow-hidden premium-shadow border border-border/30 group">
            {activeImage ? (
              <img
                src={activeImage}
                alt={produto.nome_produto}
                className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${esgotado ? "grayscale opacity-80" : ""}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Watch className="w-20 h-20 opacity-10" />
              </div>
            )}
            {esgotado && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-md flex items-center justify-center z-10">
                <span className="bg-destructive text-destructive-foreground px-8 py-3 rounded-full text-sm font-bold uppercase tracking-[0.3em] shadow-2xl">
                  Esgotado
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {uniqueImages.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none px-2">
              {uniqueImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all duration-300 ${activeImage === img ? "border-primary scale-105 shadow-lg" : "border-transparent opacity-40 hover:opacity-100"
                    }`}
                >
                  <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalhes */}
        <div className="lg:col-span-7 flex flex-col pt-4 w-full">
          <div className="mb-10 border-b border-border/30 pb-10">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[0.3em] mb-4">
              {produto.genero}
            </p>
            <h1 className="text-4xl md:text-5xl font-serif-elegant font-medium leading-tight text-foreground mb-6">
              {produto.nome_produto}
            </h1>
            <p className="text-3xl font-light text-foreground/90 tracking-tight">
              {formatCurrency(preco)}
            </p>

            {/* Estoque */}
            {!esgotado && (
              <div className="mt-8 inline-flex items-center gap-3 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider border border-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Disponível para Envio Imediato
              </div>
            )}
          </div>

          {/* Abas de Informação */}
          <Tabs defaultValue="descricao" className="w-full mb-12">
            <TabsList className="w-full justify-start bg-transparent border-b border-border/30 rounded-none h-12 p-0 gap-8">
              <TabsTrigger value="descricao" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-[0.2em]">Detalhes</TabsTrigger>
              <TabsTrigger value="especificacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-[0.2em]">Especificações</TabsTrigger>
            </TabsList>

            <TabsContent value="descricao" className="pt-8">
              <div className="prose prose-sm dark:prose-invert text-muted-foreground leading-relaxed font-light">
                <p className="whitespace-pre-wrap text-base leading-relaxed">{produto.descricao || "Relógio de alta qualidade e design sofisticado. Ideal para compor o seu visual com elegância e precisão."}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
                <div className="flex items-center gap-4 group p-4 rounded-2xl bg-secondary/30 border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-colors">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Originalidade</p>
                    <p className="text-xs text-muted-foreground">Produto 100% autêntico</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group p-4 rounded-2xl bg-secondary/30 border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-colors">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Entrega Premium</p>
                    <p className="text-xs text-muted-foreground">Seguro total incluso</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="especificacoes" className="pt-8">
              <div className="divide-y divide-border/30 border-t border-border/30">
                {Object.entries(specs).map(([key, value]) => {
                  if (!value) return null;
                  const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                  return (
                    <div key={key} className="flex justify-between py-4">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                      <span className="text-sm font-medium text-right text-foreground">{value as string}</span>
                    </div>
                  );
                })}
                {Object.keys(specs).length === 0 && (
                  <div className="py-8 text-center text-muted-foreground italic font-light">
                    Especificações técnicas sob consulta.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-4 mt-auto">
            <Button
              size="lg"
              className="flex-1 h-16 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full bg-foreground text-background hover:bg-primary hover:text-white transition-all duration-500 shadow-xl"
              disabled={esgotado}
              onClick={buyDirectlyWhatsApp}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              Solicitar (WhatsApp)
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="flex-1 h-16 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border-border hover:border-primary hover:bg-transparent transition-all duration-500"
              disabled={esgotado}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-5 h-5 mr-3" />
              Adicionar à Sacola
            </Button>
          </div>

          {esgotado && (
            <p className="text-center text-[11px] font-bold uppercase tracking-widest text-destructive mt-6">
              Indisponível no momento
            </p>
          )}
        </div>
      </div>

      {/* ── Sugestões Inteligentes ────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="mt-32 pt-32 border-t border-border/30">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <h2 className="text-[11px] font-bold text-primary uppercase tracking-[0.4em] mb-4">Você também pode gostar</h2>
              <h3 className="text-3xl md:text-4xl font-serif-elegant">Sugestões Selecionadas</h3>
            </div>
            <Link to="/colecao" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors pb-1 border-b border-border/50 hover:border-primary">
              Ver Coleção Completa
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map((p, i) => (
              <Link 
                key={p.id} 
                to={`/produto/${p.id}`} 
                className="group flex flex-col animate-reveal"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative aspect-[4/5] bg-card rounded-2xl overflow-hidden mb-6 premium-shadow border border-border/30">
                  {p.imagem_url ? (
                    <img
                      src={p.imagem_url}
                      alt={p.nome_produto}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20">
                      <Watch className="w-12 h-12 opacity-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="text-center px-2">
                  <p className="text-[9px] text-primary uppercase tracking-[0.3em] font-bold mb-2">{p.genero}</p>
                  <h4 className="font-serif-elegant text-base text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">{p.nome_produto}</h4>
                  <p className="text-xs font-light text-muted-foreground tracking-wide">{formatCurrency(p.preco_com_margem)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
