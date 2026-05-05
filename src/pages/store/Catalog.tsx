import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, Watch, ArrowRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

type ProdutoPublico = {
  id: string;
  nome_produto: string;
  descricao: string | null;
  genero: string | null;
  imagem_url: string | null;
  galeria_imagens: string[] | null;
  especificacoes: any | null;
  preco_com_margem: number;
  estoque_atual: number;
};

export default function Catalog() {
  const [produtos, setProdutos] = useState<ProdutoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [maxPriceInDb, setMaxPriceInDb] = useState(5000);

  // Extrair marcas únicas das especificações
  const brands = Array.from(new Set(
    produtos
      .map(p => (p.especificacoes as any)?.marca || (p.especificacoes as any)?.Marca)
      .filter(Boolean)
  )).sort() as string[];

  useEffect(() => {
    async function loadProdutos() {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome_produto, descricao, genero, imagem_url, galeria_imagens, especificacoes, preco_com_margem, estoque_atual")
        .order("criado_em", { ascending: false });

      if (!error && data) {
        setProdutos(data as ProdutoPublico[]);
        const prices = data.map(p => p.preco_com_margem);
        if (prices.length > 0) {
          const max = Math.ceil(Math.max(...prices));
          setMaxPriceInDb(max);
          setPriceRange([0, max]);
        }
      }
      setLoading(false);
    }
    loadProdutos();
  }, []);

  const filteredProdutos = produtos.filter((p) => {
    // Filtro de visibilidade (Aparecer na coleção)
    const exibir = (p.especificacoes as any)?.exibir_na_loja !== "Não";
    if (!exibir) return false;

    const matchesSearch = p.nome_produto.toLowerCase().includes(search.toLowerCase());
    const matchesGender = selectedGenders.length === 0 || (p.genero && selectedGenders.includes(p.genero));
    const marca = (p.especificacoes as any)?.marca || (p.especificacoes as any)?.Marca;
    const matchesBrand = selectedBrands.length === 0 || (marca && selectedBrands.includes(marca));
    const matchesPrice = p.preco_com_margem >= priceRange[0] && p.preco_com_margem <= priceRange[1];
    return matchesSearch && matchesGender && matchesBrand && matchesPrice;
  });

  const toggleGender = (gender: string) => {
    setSelectedGenders(prev =>
      prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedGenders([]);
    setSelectedBrands([]);
    setPriceRange([0, maxPriceInDb]);
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 font-sans-elegant">
      <div className="flex flex-col md:flex-row gap-12 lg:gap-16">
        {/* Sidebar de Filtros */}
        <aside className="w-full md:w-72 space-y-10">
          <div>
            <h1 className="text-4xl font-serif-elegant font-medium mb-3">Coleção</h1>
            <p className="text-muted-foreground text-[13px] leading-relaxed">Explore a nossa curadoria exclusiva de alta relojoaria.</p>
          </div>

          <div className="space-y-8 p-6 bg-muted/30 rounded-[2rem] border border-border/50">
            {/* Pesquisa */}
            <div className="space-y-4">
              <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">Pesquisar</Label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Nome do relógio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-xl bg-background border-border/50 focus:ring-primary/20 h-11 text-sm"
                />
              </div>
            </div>

            {/* Marcas/Modelos */}
            {brands.length > 0 && (
              <div className="space-y-4">
                <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">Marca</Label>
                <div className="flex flex-col gap-3">
                  {brands.map((brand) => (
                    <div key={brand} className="flex items-center space-x-3 group cursor-pointer" onClick={() => toggleBrand(brand)}>
                      <Checkbox
                        id={brand}
                        checked={selectedBrands.includes(brand)}
                        onCheckedChange={() => toggleBrand(brand)}
                        className="rounded-md border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor={brand} className="text-xs font-medium uppercase tracking-widest cursor-pointer group-hover:text-primary transition-colors">
                        {brand}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gênero */}
            <div className="space-y-4">
              <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">Gênero</Label>
              <div className="flex flex-col gap-3">
                {["masculino", "feminino", "unisex"].map((gender) => (
                  <div key={gender} className="flex items-center space-x-3 group cursor-pointer" onClick={() => toggleGender(gender)}>
                    <Checkbox
                      id={gender}
                      checked={selectedGenders.includes(gender)}
                      onCheckedChange={() => toggleGender(gender)}
                      className="rounded-md border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label htmlFor={gender} className="text-xs font-medium uppercase tracking-widest cursor-pointer group-hover:text-primary transition-colors">
                      {gender}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preço */}
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">Preço Máximo</Label>
                <span className="text-xs font-bold text-primary">
                  {formatCurrency(priceRange[1])}
                </span>
              </div>
              <Slider
                defaultValue={[0, maxPriceInDb]}
                max={maxPriceInDb}
                step={50}
                value={[priceRange[1]]}
                onValueChange={(val) => setPriceRange([0, val[0]])}
                className="py-2"
              />
            </div>

            {/* Limpar Filtros */}
            <Button
              variant="ghost"
              className="w-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary/5 hover:text-primary transition-all"
              onClick={clearFilters}
            >
              <X className="w-3 h-3 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </aside>

        {/* Grid de Produtos */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-10 border-b border-border/30 pb-6">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
              Exibindo <span className="text-foreground">{filteredProdutos.length}</span> modelos
            </p>
            <div className="flex items-center gap-2 text-[11px] font-bold text-primary uppercase tracking-[0.2em] md:hidden cursor-pointer">
               <SlidersHorizontal className="w-4 h-4" /> Filtros
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[4/5] w-full rounded-[2rem]" />
                  <Skeleton className="h-4 w-2/3 mx-auto" />
                  <Skeleton className="h-4 w-1/3 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
              {filteredProdutos.map((produto, i) => {
                const esgotado = produto.estoque_atual <= 0;
                return (
                  <Link
                    key={produto.id}
                    to={`/produto/${produto.id}`}
                    className={`group flex flex-col animate-reveal ${esgotado ? "opacity-60 grayscale-[0.5]" : ""}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="relative aspect-[4/5] bg-card rounded-[2rem] overflow-hidden mb-6 premium-shadow border border-border/30">
                      {produto.imagem_url ? (
                        <img
                          src={produto.imagem_url}
                          alt={produto.nome_produto}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <Watch className="w-16 h-16 text-muted-foreground/20 mx-auto mt-24" strokeWidth={0.5} />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                        <span className="px-6 py-3 bg-white text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-full translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          Ver Detalhes
                        </span>
                      </div>

                      {esgotado && (
                        <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Esgotado
                        </div>
                      )}
                    </div>

                    <div className="text-center px-2">
                      <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold mb-2">
                        {produto.genero}
                      </p>
                      <h3 className="font-serif-elegant text-lg text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                        {produto.nome_produto}
                      </h3>
                      <p className="font-medium text-muted-foreground tracking-wide">
                        {formatCurrency(produto.preco_com_margem)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && filteredProdutos.length === 0 && (
            <div className="text-center py-32 bg-muted/20 rounded-[3rem] border border-dashed border-border/50 mt-8">
              <Watch className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" strokeWidth={0.5} />
              <p className="text-lg font-serif-elegant text-muted-foreground mb-6">Nenhum modelo corresponde aos filtros.</p>
              <Button 
                variant="outline" 
                onClick={clearFilters} 
                className="rounded-full px-10 border-primary text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold uppercase tracking-widest h-12"
              >
                Resetar Filtros
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

