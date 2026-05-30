import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Truck, MessageCircle, ShoppingCart, ArrowLeft, CheckCircle2, Watch, Star, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  sku: string | null;
};

const WHATSAPP = "5585987939498";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Produto[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [apiMain, setApiMain] = useState<CarouselApi>();
  const [apiModal, setApiModal] = useState<CarouselApi>();
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  useEffect(() => {
    if (!apiMain) return;
    apiMain.on("select", () => setCurrentSlide(apiMain.selectedScrollSnap()));
  }, [apiMain]);

  useEffect(() => {
    if (!apiModal) return;
    apiModal.on("select", () => setCurrentSlide(apiModal.selectedScrollSnap()));
  }, [apiModal]);

  useEffect(() => {
    if (apiMain && apiMain.selectedScrollSnap() !== currentSlide) {
      apiMain.scrollTo(currentSlide);
    }
    if (apiModal && apiModal.selectedScrollSnap() !== currentSlide) {
      apiModal.scrollTo(currentSlide);
    }
  }, [currentSlide, apiMain, apiModal]);

  useEffect(() => {
    async function loadProduto() {
      if (!id) return;
      setLoading(true);

      const { data, error } = await (supabase
        .from("produtos")
        .select("id, nome_produto, descricao, genero, imagem_url, galeria_imagens, especificacoes, preco_com_margem, estoque_atual, sku")
        .eq("id", id)
        .single() as any);

      if (!error && data) {
        setProduto(data as Produto);

        // Carregar avaliações do produto
        const { data: avData } = await supabase
          .from("avaliacoes")
          .select("*")
          .eq("produto_id", id)
          .order("criado_em", { ascending: false });

        if (avData) {
          setAvaliacoes(avData);
        }

        // Carregar produtos relacionados de forma "inteligente"
        loadRelated(data as Produto);
      } else {
        setProduto(null);
      }
      setLoading(false);
    }

    async function loadRelated(current: Produto) {
      // Busca produtos do mesmo gênero, excluindo o atual
      const { data } = await (supabase
        .from("produtos")
        .select("id, nome_produto, genero, imagem_url, preco_com_margem, estoque_atual, especificacoes, sku")
        .eq("genero", current.genero)
        .neq("id", current.id)
        .limit(10) as any);

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
      sku: produto.sku || undefined,
      quantidade: 1,
      estoque_disponivel: produto.estoque_atual,
    });
    toast.success("Adicionado à sacola!");
  };

  const handleAddToCartRelated = (e: React.MouseEvent, p: Produto) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: p.id,
      nome_produto: p.nome_produto,
      preco: p.preco_com_margem,
      imagem_url: p.imagem_url,
      sku: p.sku || undefined,
      quantidade: 1,
      estoque_disponivel: p.estoque_atual,
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
          <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
            <div className="relative bg-card rounded-[2.5rem] overflow-hidden premium-shadow border border-border/30 group">
              {uniqueImages.length > 0 ? (
                <Carousel setApi={setApiMain} className="w-full" opts={{ loop: true }}>
                  <CarouselContent>
                    {uniqueImages.map((img, index) => (
                      <CarouselItem key={index}>
                        <DialogTrigger asChild>
                          <div className="w-full aspect-square relative cursor-zoom-in overflow-hidden">
                            <img
                              src={img}
                              alt={`${produto.nome_produto} ${index + 1}`}
                              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${esgotado ? "grayscale opacity-80" : ""}`}
                            />
                          </div>
                        </DialogTrigger>
                      </CarouselItem>
                    ))}
                  </CarouselContent>

                  {/* Dots for main carousel */}
                  {uniqueImages.length > 1 && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
                      {uniqueImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            apiMain?.scrollTo(index);
                          }}
                          className={`w-2 h-2 rounded-full transition-all ${currentSlide === index ? "bg-primary w-6" : "bg-white/50 hover:bg-white/80"
                            }`}
                        />
                      ))}
                    </div>
                  )}
                </Carousel>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Watch className="w-20 h-20 opacity-10" />
                </div>
              )}
              {esgotado && (
                <div className="absolute inset-0 bg-background/40 backdrop-blur-md flex items-center justify-center z-10 pointer-events-none">
                  <span className="bg-destructive text-destructive-foreground px-8 py-3 rounded-full text-sm font-bold uppercase tracking-[0.3em] shadow-2xl">
                    Esgotado
                  </span>
                </div>
              )}
              {uniqueImages.length > 0 && (
                <DialogTrigger asChild>
                  <button className="absolute top-4 right-4 bg-white/20 backdrop-blur-md hover:bg-white/40 text-black w-10 h-10 rounded-full flex items-center justify-center transition-all z-10 opacity-0 group-hover:opacity-100">
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </DialogTrigger>
              )}
            </div>

            <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] p-2 bg-black/95 border-none flex flex-col gap-4">
              <DialogTitle className="sr-only">Visualizar Imagem</DialogTitle>
              <DialogDescription className="sr-only">Galeria de imagens do produto</DialogDescription>

              <div className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0">
                <Carousel setApi={setApiModal} className="w-full h-full flex flex-col justify-center" opts={{ loop: true }}>
                  <CarouselContent className="items-center h-full">
                    {uniqueImages.map((img, index) => (
                      <CarouselItem key={index} className="flex items-center justify-center h-full">
                        <img
                          src={img}
                          alt={`${produto.nome_produto} ${index + 1}`}
                          className="max-w-full max-h-[75vh] object-contain"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>

              {/* Thumbnails in Fullscreen */}
              {uniqueImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-4 pt-2 scrollbar-none px-4 justify-center items-center h-28 shrink-0">
                  {uniqueImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => apiModal?.scrollTo(index)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-300 ${currentSlide === index ? "border-primary scale-110 shadow-lg" : "border-transparent opacity-40 hover:opacity-100"
                        }`}
                    >
                      <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Detalhes */}
        <div className="lg:col-span-7 flex flex-col pt-4 w-full">
          <div className="mb-8 border-b border-border/30 pb-8">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[0.3em] mb-4">
              {produto.genero}
            </p>
            <h1 className="text-4xl md:text-5xl font-serif-elegant font-medium leading-tight text-foreground mb-6">
              {produto.nome_produto}
            </h1>
            <div className="flex items-end gap-3 mb-6">
              <p className="text-3xl font-light text-foreground/90 tracking-tight leading-none">
                {formatCurrency(preco)}
              </p>
              {specs?.valor_promocional && Number(specs.valor_promocional) > preco && (
                <p className="text-xl font-medium text-muted-foreground line-through pb-[3px]">
                  {formatCurrency(Number(specs.valor_promocional))}
                </p>
              )}
            </div>

            {/* Estoque */}
            {!esgotado && (
              <div className="mt-6 inline-flex items-center gap-3 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider border border-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Disponível para Envio Imediato
              </div>
            )}
          </div>

          {/* ── Botões de Compra ──────────────────────────────── */}
          <div className="flex flex-col gap-3 mb-10">
            {/* Compra Online */}
            <Button
              size="lg"
              className="w-full h-14 text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
              disabled={esgotado}
              onClick={() => {
                addItem({
                  id: produto.id,
                  nome_produto: produto.nome_produto,
                  preco,
                  imagem_url: produto.imagem_url,
                  sku: produto.sku || undefined,
                  quantidade: 1,
                  estoque_disponivel: produto.estoque_atual,
                });
                navigate("/carrinho");
              }}
            >
              <ShoppingCart className="w-4 h-4 mr-2.5" />
              Comprar Agora (Via Pix ou WhatsApp)
            </Button>

            {/* Dois botões secundários lado a lado */}
            <div className="flex flex-col gap-3">
              {/* <Button
                size="lg"
                variant="outline"
                className="h-12 text-[10px] font-bold uppercase tracking-[0.15em] rounded-2xl border-border hover:border-green-500 hover:text-green-600 hover:bg-green-500/5 transition-all duration-300"
                disabled={esgotado}
                onClick={buyDirectlyWhatsApp}
              >
                <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                Via WhatsApp
              </Button> */}

              <Button
                size="lg"
                variant="outline"
                className="w-full h-12 text-[10px] font-bold uppercase tracking-[0.15em] rounded-2xl border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-300"
                disabled={esgotado}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Adicionar à Sacola
              </Button>
            </div>

            {esgotado && (
              <p className="text-center text-[11px] font-bold uppercase tracking-widest text-destructive">
                Indisponível no momento
              </p>
            )}
          </div>

          {/* ── Abas de Informação ───────────────────────────── */}
          <Tabs defaultValue="descricao" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border/30 rounded-none h-12 p-0 gap-8">
              <TabsTrigger value="descricao" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-[0.2em]">Detalhes</TabsTrigger>
              <TabsTrigger value="especificacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-[0.2em]">Especificações</TabsTrigger>
              <TabsTrigger value="avaliacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-[0.2em]">Avaliações ({avaliacoes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="descricao" className="pt-8">
              <div className="prose prose-sm dark:prose-invert text-muted-foreground leading-relaxed font-light">
                <p className="whitespace-pre-wrap text-base leading-relaxed">{produto.descricao || "Relógio de alta qualidade e design sofisticado. Ideal para compor o seu visual com elegância e precisão."}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
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

            <TabsContent value="avaliacoes" className="pt-8">
              {avaliacoes.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground italic font-light">
                  Nenhuma avaliação para este produto ainda. Seja o primeiro a comprar e avaliar!
                </div>
              ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                  {avaliacoes.map((av) => (
                    <div key={av.id} className="border-b border-border/30 pb-6 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{av.titulo}</h4>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(av.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                          </span>
                        </div>
                        <div className="flex gap-0.5 text-yellow-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < av.estrelas ? "fill-yellow-500 text-yellow-500" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>

                      {av.mensagem && (
                        <p className="text-sm text-muted-foreground leading-relaxed italic">
                          "{av.mensagem}"
                        </p>
                      )}

                      {av.imagem_url && (
                        <div className="mt-4 max-w-[200px] rounded-xl overflow-hidden border border-border/30">
                          <img src={av.imagem_url} alt="Foto da avaliação" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
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
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center backdrop-blur-[2px] gap-4">
                    <span className="px-6 py-3 bg-white text-black text-[9px] font-bold uppercase tracking-[0.3em] rounded-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-500 shadow-2xl">
                      Ver Detalhes
                    </span>
                    {p.estoque_atual > 0 && (
                      <button
                        onClick={(e) => handleAddToCartRelated(e, p)}
                        className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center translate-y-4 group-hover:translate-y-0 transition-transform duration-500 hover:scale-110 hover:bg-primary/90 shadow-xl"
                        title="Adicionar à sacola"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
