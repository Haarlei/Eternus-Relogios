import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Truck, MessageCircle, ShoppingCart, ArrowLeft, CheckCircle2, Box } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;

const WHATSAPP = "5585987939498";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduto() {
      if (!id) return;
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setProduto(data);
        setActiveImage(data.imagem_url || (data.galeria_imagens && data.galeria_imagens.length > 0 ? data.galeria_imagens[0] : null));
      }
      setLoading(false);
    }
    loadProduto();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl flex flex-col md:flex-row gap-8">
        <Skeleton className="w-full md:w-1/2 aspect-square rounded-3xl" />
        <div className="w-full md:w-1/2 space-y-4 pt-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-20 w-full mt-8" />
        </div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Produto não encontrado</h2>
        <Button onClick={() => navigate("/")}>Voltar para a loja</Button>
      </div>
    );
  }

  const preco = produto.preco_com_margem || (produto.preco_fornecedor * (1 + produto.margem / 100));
  const esgotado = produto.estoque_atual <= 0;
  
  const allImages = [];
  if (produto.imagem_url) allImages.push(produto.imagem_url);
  if (produto.galeria_imagens) allImages.push(...produto.galeria_imagens);
  const uniqueImages = Array.from(new Set(allImages));
  
  const specs = produto.especificacoes as any || {};

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
  };

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 max-w-6xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
        {/* Imagens */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="relative aspect-[4/5] md:aspect-square bg-muted rounded-3xl overflow-hidden border border-border/50">
            {activeImage ? (
              <img
                src={activeImage}
                alt={produto.nome_produto}
                className={`w-full h-full object-cover transition-all duration-300 ${esgotado ? "grayscale opacity-80" : ""}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Sem imagem
              </div>
            )}
            {esgotado && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center z-10">
                <span className="bg-destructive text-destructive-foreground px-6 py-2 rounded-full text-lg font-bold uppercase tracking-widest shadow-xl">
                  Esgotado
                </span>
              </div>
            )}
          </div>
          
          {/* Thumbnails */}
          {uniqueImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {uniqueImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    activeImage === img ? "border-primary opacity-100 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalhes */}
        <div className="w-full md:w-1/2 flex flex-col pt-2 lg:pt-8">
          <div className="mb-6">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">
              {produto.genero}
            </p>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              {produto.nome_produto}
            </h1>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(preco)}
            </p>
            {/* Estoque */}
            {!esgotado && (
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold mb-6 w-fit">
                <Box className="w-4 h-4" />
                {produto.estoque_atual === 1 
                  ? "Última unidade em estoque!" 
                  : `Apenas ${produto.estoque_atual} unidades em estoque`}
              </div>
            )}
          </div>

          {/* Abas de Informação */}
          <Tabs defaultValue="descricao" className="w-full mb-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="descricao">Descrição</TabsTrigger>
              <TabsTrigger value="especificacoes">Especificações</TabsTrigger>
            </TabsList>
            <TabsContent value="descricao" className="pt-4">
              <div className="prose prose-sm dark:prose-invert text-muted-foreground">
                <p className="whitespace-pre-wrap">{produto.descricao || "Relógio de alta qualidade e design sofisticado. Ideal para compor o seu visual com elegância."}</p>
              </div>
              
              <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-border/50">
                <div className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Produto 100% Original</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span>Garantia de Fábrica</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium">
                  <Truck className="w-5 h-5 text-primary" />
                  <span>Envio Seguro para todo Brasil</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="especificacoes" className="pt-4">
              <div className="space-y-0 text-sm border border-border/50 rounded-xl overflow-hidden">
                {Object.entries(specs).map(([key, value], index) => {
                  if (!value) return null;
                  const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                  return (
                    <div key={key} className={`flex justify-between p-3 ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}>
                      <span className="text-muted-foreground font-medium">{label}</span>
                      <span className="font-semibold text-right max-w-[60%]">{value as string}</span>
                    </div>
                  );
                })}
                {Object.keys(specs).length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhuma especificação cadastrada.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col gap-4 mt-auto">
            <Button
              size="lg"
              className="w-full h-14 text-base font-semibold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_var(--primary)]/30 hover:shadow-[0_0_30px_var(--primary)]/50 transition-all hover:-translate-y-1"
              disabled={esgotado}
              onClick={buyDirectlyWhatsApp}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Comprar pelo WhatsApp
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-base font-semibold rounded-2xl border-2 hover:bg-muted transition-all"
              disabled={esgotado}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Adicionar ao Carrinho
            </Button>
          </div>
          
          {esgotado && (
            <p className="text-center text-sm text-destructive mt-4 font-medium">
              Este produto está fora de estoque no momento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
