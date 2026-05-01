import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Truck, Star, ArrowRight } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;

const InteractiveGridTrails = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const gridSize = 24;
    const squares: { x: number, y: number, opacity: number }[] = [];

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (x < 0 || x > width || y < 0 || y > height) return;

      const gridX = Math.floor(x / gridSize) * gridSize;
      const gridY = Math.floor(y / gridSize) * gridSize;

      const existingSquare = squares.find(sq => sq.x === gridX && sq.y === gridY);
      if (existingSquare) {
        existingSquare.opacity = 1;
      } else {
        squares.push({ x: gridX, y: gridY, opacity: 1 });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      const rootStyle = getComputedStyle(document.documentElement);
      const primaryHsl = rootStyle.getPropertyValue('--primary').trim().split(' ').join(', ');
      
      for (let i = squares.length - 1; i >= 0; i--) {
        const sq = squares[i];
        sq.opacity -= 0.02; // fade out speed
        
        if (sq.opacity <= 0) {
          squares.splice(i, 1);
          continue;
        }

        // Fallback or dynamic primary color
        ctx.fillStyle = `hsla(${primaryHsl ? primaryHsl.replace(/,/g, '') : '0 0% 100%'} / ${sq.opacity * 0.4})`;
        ctx.fillRect(sq.x, sq.y, gridSize, gridSize);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full pointer-events-none" />;
};

export default function StoreHome() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("todos");

  useEffect(() => {
    async function loadProdutos() {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (!error && data) {
        setProdutos(data);
      }
      setLoading(false);
    }
    loadProdutos();
  }, []);

  const filteredProdutos = produtos.filter((p) => {
    if (filter === "todos") return true;
    return p.genero === filter;
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background border-b border-border/40 py-16 md:py-24">
        {/* Vercel-style Blueprint Grid Background */}
        <div className="absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <InteractiveGridTrails />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 to-background/20 z-10 pointer-events-none" />
        <div className="container relative z-20 mx-auto px-4 flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-4 bg-background/50 backdrop-blur-sm border-primary/20 text-primary px-3 py-1 text-xs animate-float shadow-[0_0_15px_var(--primary)]/20">
            🌟 Coleção Exclusiva
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 max-w-3xl">
            Relógios com entrega rápida e <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary/80 to-primary">pagamentos facilitado</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl">
            Descubra nossa seleção de relógios originais. Design sofisticado e qualidade impecável direto para o seu pulso.
          </p>
          <Button size="lg" className="h-14 px-8 text-lg font-semibold rounded-2xl shadow-[0_0_20px_var(--primary)]/30 hover:shadow-[0_0_30px_var(--primary)]/50 transition-all hover:-translate-y-1" onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}>
            Ver modelos disponíveis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>

          {/* Prova Social */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-12 opacity-80">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">+50 clientes atendidos</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">Entrega Rápida</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Garantia de 90 dias</span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Produtos */}
      <section id="produtos" className="py-16 container mx-auto px-4 flex-1">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Nossos Modelos</h2>

          <div className="flex bg-card p-1 rounded-xl border border-border/50">
            {["todos", "masculino", "feminino", "unisex"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[250px] md:h-[300px] w-full rounded-2xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProdutos.map((produto) => {
              const preco = produto.preco_com_margem || (produto.preco_fornecedor * (1 + produto.margem / 100));
              const esgotado = produto.estoque_atual <= 0;

              return (
                <Link
                  key={produto.id}
                  to={`/produto/${produto.id}`}
                  className={`group flex flex-col bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/50 transition-all hover:shadow-xl ${esgotado ? "opacity-60 grayscale-[0.5]" : ""}`}
                >
                  <div className="relative aspect-[4/5] bg-muted overflow-hidden flex items-center justify-center">
                    {produto.imagem_url ? (
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome_produto}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-muted-foreground">Sem Imagem</span>
                    )}
                    {esgotado && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                          Esgotado
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      {produto.genero}
                    </p>
                    <h3 className="font-semibold text-foreground line-clamp-1 mb-2">
                      {produto.nome_produto}
                    </h3>
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="font-bold text-lg">{formatCurrency(preco)}</span>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                        <ArrowRight className="w-4 h-4 text-primary group-hover:text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && filteredProdutos.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
            <p className="text-lg text-muted-foreground">Nenhum produto encontrado nesta categoria.</p>
          </div>
        )}
      </section>
    </div>
  );
}
