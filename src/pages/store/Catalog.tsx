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
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [maxPriceInDb, setMaxPriceInDb] = useState(5000);

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
    const matchesSearch = p.nome_produto.toLowerCase().includes(search.toLowerCase());
    const matchesGender = selectedGenders.length === 0 || (p.genero && selectedGenders.includes(p.genero));
    const matchesPrice = p.preco_com_margem >= priceRange[0] && p.preco_com_margem <= priceRange[1];
    return matchesSearch && matchesGender && matchesPrice;
  });

  const toggleGender = (gender: string) => {
    setSelectedGenders(prev =>
      prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedGenders([]);
    setPriceRange([0, maxPriceInDb]);
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Filtros */}
        <aside className="w-full md:w-64 space-y-8">
          <div>
            <h1 className="text-2xl font-bold font-serif-elegant mb-2">Coleção</h1>
            <p className="text-muted-foreground text-sm">Explore nossa seleção exclusiva</p>
          </div>

          <div className="space-y-6">
            {/* Pesquisa */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pesquisar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do relógio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-xl border-border/50 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Gênero */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gênero</Label>
              <div className="space-y-2">
                {["masculino", "feminino", "unisex"].map((gender) => (
                  <div key={gender} className="flex items-center space-x-2">
                    <Checkbox
                      id={gender}
                      checked={selectedGenders.includes(gender)}
                      onCheckedChange={() => toggleGender(gender)}
                    />
                    <label htmlFor={gender} className="text-sm font-medium capitalize cursor-pointer">
                      {gender}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preço */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preço</Label>
                <span className="text-xs font-mono font-bold text-primary">
                  {formatCurrency(priceRange[1])}
                </span>
              </div>
              <Slider
                defaultValue={[0, maxPriceInDb]}
                max={maxPriceInDb}
                step={50}
                value={[priceRange[1]]}
                onValueChange={(val) => setPriceRange([0, val[0]])}
                className="py-4"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                <span>R$ 0</span>
                <span>{formatCurrency(maxPriceInDb)}</span>
              </div>
            </div>

            {/* Limpar Filtros */}
            <Button
              variant="outline"
              className="w-full rounded-xl border-dashed"
              onClick={clearFilters}
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </aside>

        {/* Grid de Produtos */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground font-medium">
              Mostrando <span className="text-foreground font-bold">{filteredProdutos.length}</span> modelos
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest md:hidden">
               <SlidersHorizontal className="w-4 h-4" /> Filtros
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-[250px] md:h-[300px] w-full rounded-2xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredProdutos.map((produto) => {
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
                        <span className="font-bold text-lg">{formatCurrency(produto.preco_com_margem)}</span>
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

          {!loading && filteredProdutos.length === 0 && (
            <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border mt-8">
              <Watch className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
              <p className="text-lg text-muted-foreground">Nenhum produto encontrado com os filtros selecionados.</p>
              <Button variant="link" onClick={clearFilters} className="mt-2 text-primary font-bold">
                Remover todos os filtros
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

