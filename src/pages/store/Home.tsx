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
    // Filtro de visibilidade
    const exibir = (p.especificacoes as any)?.exibir_na_loja !== "Não";
    if (!exibir) return false;

    if (filter === "todos") return true;
    return p.genero === filter;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Hero (Novo Design) ────────────────────────────────────────── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-[#050505]">
        {/* Background Image Container */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=1920&q=80"
            alt="Luxury Watch Background"
            className="w-full h-full object-cover scale-105 animate-hero-slide-in opacity-40"
          />
          {/* Overlay gradiente para profundidade e legibilidade, forçando escuro */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#050505]" />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="container relative z-10 mx-auto px-6 flex flex-col items-center text-center">
          <div className="flex flex-col items-center animate-hero-fade-up">
            <span className="text-[10px] lg:text-[12px] font-bold uppercase tracking-[0.5em] text-primary mb-6 luxury-text-shadow">
              Relógio importados com visual premium
            </span>

            <h1 className="font-serif-elegant text-5xl md:text-7xl lg:text-[90px] text-white leading-[1.1] mb-8 max-w-5xl tracking-tight">
              O Visual que Impressiona. <span className="text-primary italic font-light">O Preço que Surpreende.</span>
            </h1>

            <p className="text-white/60 text-sm md:text-base lg:text-lg font-light tracking-[0.05em] max-w-2xl mb-12 leading-relaxed">
              Relógios importados com acabamento premium — para quem tem estilo sem abrir mão do bom senso.
            </p>

            <Link
              to="/colecao"
              className="group relative flex items-center gap-6 px-12 py-5 bg-primary text-black rounded-sm font-bold text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-primary/90 active:scale-95"
            >
              <span>Ver os Modelos Disponíveis</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
            </Link>
          </div>
        </div>

        {/* Indicador de Scroll Inferior */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 animate-bounce opacity-30">
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-primary to-transparent" />
        </div>
      </section>

      {/* ── Categorias ────────────────────────────────────────────────── */}
      <section className="py-32 container mx-auto px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {[
            { title: "Masculino", sub: "Força & Precisão", filter: "masculino", img: "https://images.unsplash.com/photo-1660959324993-c8cee4fba45c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mzl8fHdhdGNoJTIwbWFzY3VsaW5vfGVufDB8fDB8fHww" },
            { title: "Feminino", sub: "Elegância & Brilho", filter: "feminino", img: "https://images.unsplash.com/photo-1653651460792-34c383a224fb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fHdhdGNoJTIwZmVtaW5pbm98ZW58MHx8MHx8fDA%3D" },
          ].map((cat, i) => (
            <button
              key={i}
              onClick={() => {
                setFilter(cat.filter);
                document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group relative h-[250px] overflow-hidden rounded-sm animate-reveal"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <img src={cat.img} alt={cat.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-500" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
                <p className="text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0">{cat.sub}</p>
                <h3 className="text-4xl lg:text-5xl font-serif-elegant text-white font-medium tracking-wide">{cat.title}</h3>
                <div className="mt-8 w-12 h-[1px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Grid de Produtos ─────────────────────────────────────────────── */}
      <section id="produtos" className="py-32 bg-secondary/20 border-y border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center text-center mb-24">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-primary mb-6">A Curadoria</h2>
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-serif-elegant tracking-tight">Modelos em Destaque</h3>

            <div className="mt-12 flex flex-wrap justify-center gap-4">
              {["todos", "masculino", "feminino", "unisex"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-10 py-3 text-[10px] font-bold uppercase tracking-[0.3em] rounded-full transition-all border ${filter === f
                    ? "bg-foreground text-background border-foreground shadow-xl scale-105"
                    : "bg-transparent text-muted-foreground border-border/60 hover:border-primary hover:text-foreground"
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-6">
                  <Skeleton className="aspect-[4/5] w-full rounded-sm" />
                  <Skeleton className="h-4 w-2/3 mx-auto" />
                  <Skeleton className="h-4 w-1/3 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto">
              {filteredProdutos.slice(0, 3).map((produto, i) => {
                const preco = produto.preco_com_margem;
                const esgotado = produto.estoque_atual <= 0;

                return (
                  <Link
                    key={produto.id}
                    to={`/produto/${produto.id}`}
                    className={`group flex flex-col animate-reveal ${esgotado ? "opacity-60 grayscale-[0.5]" : ""}`}
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className="relative aspect-[4/5] bg-card rounded-sm overflow-hidden mb-8 shadow-sm group-hover:shadow-xl transition-all duration-700 border border-border/30">
                      {produto.imagem_url ? (
                        <img
                          src={produto.imagem_url}
                          alt={produto.nome_produto}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                      ) : (
                        <Watch className="w-16 h-16 text-muted-foreground/20 mx-auto mt-24" strokeWidth={0.5} />
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="px-8 py-4 bg-white text-black text-[10px] font-bold uppercase tracking-[0.3em] rounded-sm translate-y-6 group-hover:translate-y-0 transition-transform duration-700 shadow-2xl">
                          Ver Detalhes
                        </span>
                      </div>

                      {esgotado && (
                        <div className="absolute top-6 right-6 bg-destructive text-destructive-foreground px-4 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest shadow-lg">
                          Esgotado
                        </div>
                      )}
                    </div>

                    <div className="text-center px-4">
                      <p className="text-[9px] text-primary uppercase tracking-[0.4em] font-bold mb-3">
                        {produto.genero}
                      </p>
                      <h3 className="font-serif-elegant text-xl text-foreground line-clamp-1 mb-3 group-hover:text-primary transition-colors duration-500">
                        {produto.nome_produto}
                      </h3>
                      <p className="font-light text-muted-foreground tracking-[0.1em] text-sm">
                        {formatCurrency(preco)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Botão Ver Mais — Sempre visível agora conforme solicitado */}
          <div className="mt-24 flex justify-center">
            <Link
              to="/colecao"
              className="group relative flex items-center gap-8 px-14 py-6 bg-card border border-border/50 rounded-sm font-bold text-[10px] uppercase tracking-[0.4em] overflow-hidden transition-all hover:scale-105 hover:border-primary shadow-sm hover:shadow-2xl"
            >
              <span className="relative z-10">Ver Coleção Completa</span>
              <ArrowRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-3" />
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Seção Trust ────────────────────────────────────────────────── */}
      <section className="py-40 container mx-auto px-6 border-t border-border/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-20">
          {[
            { icon: ShieldCheck, title: "Autenticidade", desc: "Garantia de originalidade em todas as peças curadas." },
            { icon: Truck, title: "Entrega Segura", desc: "Envio com seguro total e rastreamento em tempo real." },
            { icon: Star, title: "Experiência VIP", desc: "Atendimento personalizado e suporte concierge dedicado." },
            { icon: Watch, title: "Garantia Eternus", desc: "Suporte técnico especializado e garantia de 12 meses." },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center group animate-reveal" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-8 transition-all duration-700 group-hover:bg-primary group-hover:text-black">
                <item.icon className="w-8 h-8 transition-transform duration-700 group-hover:scale-110" strokeWidth={1} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-[0.3em] mb-4 text-foreground/90">{item.title}</h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed font-light tracking-wide">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
