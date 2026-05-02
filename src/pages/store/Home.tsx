import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Truck, Star, ArrowRight, ChevronLeft, ChevronRight, Watch } from "lucide-react";

// Tipo local com apenas os campos públicos necessários para a vitrine
type ProdutoPublico = {
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

// ─── Slide Hero ───────────────────────────────────────────────────────────────
function HeroSlide({ produtos }: { produtos: ProdutoPublico[] }) {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = produtos
    .filter((p) => p.imagem_url)
    .slice(0, 6);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setAnimKey((k) => k + 1);
  }, []);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, slides.length, goTo]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, slides.length, goTo]);

  // Auto-advance every 4.5s
  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setTimeout(next, 4500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, slides.length, next]);

  if (slides.length === 0) {
    // Placeholder elegante quando não há imagens
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-muted/60 to-muted flex items-center justify-center rounded-3xl">
        <Watch className="w-24 h-24 text-primary/20" strokeWidth={1} />
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden group shadow-2xl">
      {/* Imagem com animação de entrada */}
      <img
        key={animKey}
        src={slide.imagem_url!}
        alt={slide.nome_produto}
        className="absolute inset-0 w-full h-full object-cover animate-hero-slide-in"
      />

      {/* Overlay gradiente inferior */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Info do produto */}
      <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-medium mb-1">
          {slide.genero}
        </p>
        <p className="font-semibold text-sm line-clamp-1">{slide.nome_produto}</p>
        <p className="text-primary font-bold text-base">{formatCurrency(slide.preco_com_margem)}</p>
      </div>

      {/* Navegação — setas */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute top-4 right-4 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-5 h-1.5 bg-primary"
                  : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── InteractiveGridTrails ─────────────────────────────────────────────────────
function InteractiveGridTrails() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const gridSize = 28;
    const squares: { x: number; y: number; opacity: number }[] = [];

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
      const existing = squares.find((sq) => sq.x === gridX && sq.y === gridY);
      if (existing) existing.opacity = 1;
      else squares.push({ x: gridX, y: gridY, opacity: 1 });
    };

    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = squares.length - 1; i >= 0; i--) {
        const sq = squares[i];
        sq.opacity -= 0.015;
        if (sq.opacity <= 0) { squares.splice(i, 1); continue; }
        ctx.fillStyle = `hsla(43 74% 49% / ${sq.opacity * 0.3})`;
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
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StoreHome() {
  const [produtos, setProdutos] = useState<ProdutoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("todos");

  useEffect(() => {
    async function loadProdutos() {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome_produto, descricao, genero, imagem_url, galeria_imagens, especificacoes, preco_com_margem, estoque_atual")
        .order("criado_em", { ascending: false });

      if (!error && data) {
        setProdutos(data as ProdutoPublico[]);
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
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-background border-b border-border/30 min-h-[88vh] flex items-center">
        {/* Grid sutil */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808009_1px,transparent_1px),linear-gradient(to_bottom,#80808009_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]" />
        <InteractiveGridTrails />

        {/* Blob de luz dourada suave */}
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/4 blur-[100px] pointer-events-none z-0" />

        <div className="container relative z-10 mx-auto px-4 py-16 md:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* ── Coluna de Texto ── */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Badge elegante */}
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-primary text-xs font-semibold tracking-[0.15em] uppercase mb-8 animate-badge-glow animate-hero-fade-up"
                style={{ animationDelay: "0ms" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Excelência em Alta Relojoaria
              </div>

              {/* Título elegante */}
              <h1
                className="font-serif-elegant text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.12] tracking-tight mb-6 animate-hero-fade-up"
                style={{ animationDelay: "120ms", opacity: 0 }}
              >
                O Tempo é a{" "}
                <em className="not-italic hero-shimmer-text">
                  Verdadeira
                </em>
                <br />
                <span className="font-light italic text-foreground/80">Obra de Arte</span>
              </h1>

              {/* Subtítulo */}
              <p
                className="text-muted-foreground text-base md:text-lg leading-relaxed mb-10 max-w-md animate-hero-fade-up"
                style={{ animationDelay: "240ms", opacity: 0 }}
              >
                Relógios de alta qualidade com design sofisticado. Cada peça conta
                uma história única no seu pulso.
              </p>

              {/* Botão premium */}
              <div
                className="animate-hero-fade-up animate-float-gentle"
                style={{ animationDelay: "360ms", opacity: 0 }}
              >
                <Link
                  to="/colecao"
                  className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base overflow-hidden transition-all duration-500"
                  style={{
                    background: "linear-gradient(135deg, hsl(43,74%,44%) 0%, hsl(35,80%,52%) 100%)",
                    color: "#fff",
                    boxShadow: "0 4px 24px hsla(43,74%,49%,0.35), 0 1px 3px rgba(0,0,0,0.12)",
                  }}
                >
                  {/* Shimmer interno */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                  <Watch className="w-5 h-5 flex-shrink-0 relative z-10" strokeWidth={1.8} />
                  <span className="relative z-10 tracking-wide">Ver Coleção Completa</span>
                  <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Prova social */}
              <div
                className="flex flex-wrap justify-center lg:justify-start gap-5 mt-12 animate-hero-fade-up"
                style={{ animationDelay: "480ms", opacity: 0 }}
              >
                {[
                  { icon: Star, color: "text-yellow-500", fill: true, label: "+50 clientes satisfeitos" },
                  { icon: Truck, color: "text-sky-500", fill: false, label: "Entrega para todo Brasil" },
                  { icon: ShieldCheck, color: "text-primary", fill: false, label: "Garantia de 1 ano" },
                ].map(({ icon: Icon, color, fill, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Icon className={`w-4 h-4 ${color} ${fill ? "fill-yellow-500" : ""}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Coluna do Slide ── */}
            <div
              className="relative w-full h-[480px] md:h-[560px] lg:h-[620px] animate-hero-fade-up"
              style={{ animationDelay: "200ms", opacity: 0 }}
            >
              {/* Anel decorativo */}
              <div className="absolute -inset-4 rounded-[2.5rem] border border-primary/10" />
              <div className="absolute -inset-8 rounded-[3rem] border border-primary/5" />

              {loading ? (
                <Skeleton className="w-full h-full rounded-3xl" />
              ) : (
                <HeroSlide produtos={produtos} />
              )}

              {/* Etiqueta flutuante — decorativa */}
              {!loading && produtos.length > 0 && (
                <div className="absolute -bottom-4 -left-4 bg-card border border-border/60 rounded-2xl px-4 py-3 shadow-xl animate-float-gentle flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Watch className="w-4 h-4 text-primary" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coleção</p>
                    <p className="text-sm font-bold text-foreground">{produtos.length} modelos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Grid de Produtos ─────────────────────────────────────────────── */}
      <section id="produtos" className="py-16 container mx-auto px-4 flex-1">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold tracking-tight font-serif-elegant">Nossos Modelos</h2>

          <div className="flex bg-card p-1 rounded-xl border border-border/50">
            {["todos", "masculino", "feminino", "unisex"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all duration-200 ${
                  filter === f
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.03]"
                    : "text-muted-foreground hover:text-foreground"
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredProdutos.slice(0, 5).map((produto) => {
              const preco = produto.preco_com_margem;
              const esgotado = produto.estoque_atual <= 0;

              return (
                <Link
                  key={produto.id}
                  to={`/produto/${produto.id}`}
                  className={`group flex flex-col bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    esgotado ? "opacity-60 grayscale-[0.5]" : ""
                  }`}
                >
                  <div className="relative aspect-[4/5] bg-muted overflow-hidden flex items-center justify-center">
                    {produto.imagem_url ? (
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome_produto}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Watch className="w-12 h-12 text-muted-foreground/30" strokeWidth={1} />
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
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                        <ArrowRight className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Botão Ver Mais */}
        {!loading && filteredProdutos.length > 5 && (
          <div className="mt-12 flex justify-center">
            <Link
              to="/colecao"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <span className="text-foreground">Ver Coleção Completa</span>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                <ArrowRight className="w-4 h-4 text-primary group-hover:text-primary-foreground" />
              </div>
            </Link>
          </div>
        )}

        {!loading && filteredProdutos.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
            <Watch className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
            <p className="text-lg text-muted-foreground">Nenhum produto encontrado nesta categoria.</p>
          </div>
        )}
      </section>
    </div>
  );
}
