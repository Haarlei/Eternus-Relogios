import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Package, Pencil, Trash2, Eye, EyeOff, X, ImagePlus, Crown } from "lucide-react";
import { logAtividade } from "@/lib/logger";
import type { Tables } from "@/integrations/supabase/types";
type Produto = Tables<"produtos">;

const defaultSpecs = {
  marca: "",
  material_correia: "",
  tipo_fecho: "",
  tipo_bateria: "",
  forma_caixa: "",
  diametro_visor: "",
  possui_calendario: "Não",
  peso: "",
  tipo_movimento: "",
  material_caixa: "",
  resistente_agua: "Não"
};

export default function Produtos() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarImagens, setMostrarImagens] = useState(true);
  const [form, setForm] = useState({
    nome_produto: "", descricao: "", genero: "unisex",
    preco_fornecedor: 0, margem: 0, taxa_debito: 0, taxa_credito: 0, taxa_credito_2x: 0,
    estoque_inicial: 0, estoque_atual: 0,
  });
  
  const [specs, setSpecs] = useState(defaultSpecs);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [existingMainImage, setExistingMainImage] = useState<string | null>(null);
  // Index da imagem nova que será a principal (-1 = nenhuma nova definida, usa a primeira)
  const [newMainImageIndex, setNewMainImageIndex] = useState<number>(-1);

  useEffect(() => { if (user) loadProdutos(); }, [user]);

  const loadProdutos = async () => {
    const { data } = await supabase.from("produtos").select("*").order("criado_em", { ascending: false });
    setProdutos(data || []);
  };

  const resetForm = () => {
    setForm({ nome_produto: "", descricao: "", genero: "unisex", preco_fornecedor: 0, margem: 0, taxa_debito: 0, taxa_credito: 0, taxa_credito_2x: 0, estoque_inicial: 0, estoque_atual: 0 });
    setSpecs(defaultSpecs);
    setImageFiles([]);
    setExistingGallery([]);
    setExistingMainImage(null);
    setNewMainImageIndex(-1);
    setEditing(null);
  };

  const handleEdit = (p: Produto) => {
    setEditing(p);
    setForm({
      nome_produto: p.nome_produto, descricao: p.descricao || "", genero: p.genero,
      preco_fornecedor: p.preco_fornecedor, margem: p.margem, taxa_debito: p.taxa_debito,
      taxa_credito: p.taxa_credito, taxa_credito_2x: p.taxa_credito_2x,
      estoque_inicial: p.estoque_inicial, estoque_atual: p.estoque_atual,
    });
    setSpecs((p.especificacoes as any) || defaultSpecs);
    setExistingMainImage(p.imagem_url);
    setExistingGallery(p.galeria_imagens || []);
    setImageFiles([]);
    setOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const totalImages = imageFiles.length + existingGallery.length + (existingMainImage ? 1 : 0);
      if (totalImages + files.length > 5) {
        toast.error("Você pode ter no máximo 5 imagens por produto.");
        return;
      }
      setImageFiles(prev => [...prev, ...files]);
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => {
      const next = prev.filter((_, i) => i !== index);
      // Ajusta o índice principal se necessário
      if (newMainImageIndex === index) setNewMainImageIndex(-1);
      else if (newMainImageIndex > index) setNewMainImageIndex(n => n - 1);
      return next;
    });
  };

  const removeExistingImage = (url: string) => {
    if (url === existingMainImage) {
      // Promove a primeira da galeria como principal, se houver
      const next = existingGallery[0] ?? null;
      setExistingMainImage(next);
      setExistingGallery(prev => prev.slice(1));
    } else {
      setExistingGallery(prev => prev.filter(img => img !== url));
    }
  };

  // Promove uma imagem existente (galeria) para foto principal
  const promoteExistingToMain = (url: string) => {
    if (existingMainImage) {
      setExistingGallery(prev => [existingMainImage, ...prev.filter(i => i !== url)]);
    } else {
      setExistingGallery(prev => prev.filter(i => i !== url));
    }
    setExistingMainImage(url);
  };

  // Promove uma imagem nova (ainda não salva) para foto principal
  const promoteNewToMain = (index: number) => {
    setNewMainImageIndex(index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let finalMainImage: string | null = existingMainImage;
      let finalGallery: string[] = [...existingGallery];

      if (imageFiles.length > 0) {
        // Faz upload de todas as novas imagens mantendo a ordem
        const uploadedUrls: string[] = [];
        for (const file of imageFiles) {
          const ext = file.name.split(".").pop();
          const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("produtos").upload(path, file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("produtos").getPublicUrl(path);
          uploadedUrls.push(urlData.publicUrl);
        }

        const chosenIndex = newMainImageIndex >= 0 && newMainImageIndex < uploadedUrls.length
          ? newMainImageIndex : 0;

        if (!finalMainImage) {
          finalMainImage = uploadedUrls[chosenIndex];
          finalGallery = [...finalGallery, ...uploadedUrls.filter((_, i) => i !== chosenIndex)];
        } else if (newMainImageIndex >= 0) {
          finalGallery = [finalMainImage, ...finalGallery, ...uploadedUrls.filter((_, i) => i !== chosenIndex)];
          finalMainImage = uploadedUrls[chosenIndex];
        } else {
          finalGallery = [...finalGallery, ...uploadedUrls];
        }
      }

      // Monta payload separando dados do formulário dos dados de imagem
      // para garantir que imagem_url e galeria_imagens sejam sempre salvos corretamente
      const formPayload = {
        ...form,
        especificacoes: specs,
        user_id: user.id,
      };

      const imagePayload = {
        imagem_url: finalMainImage,
        galeria_imagens: finalGallery,
      };

      if (editing) {
        // Atualiza dados do formulário
        const { error: formError } = await supabase
          .from("produtos")
          .update(formPayload)
          .eq("id", editing.id);
        if (formError) throw formError;

        // Atualiza imagens separadamente — garante que imagem_url seja persistido
        const { error: imgError } = await supabase
          .from("produtos")
          .update(imagePayload)
          .eq("id", editing.id);
        if (imgError) throw imgError;

        await logAtividade({
          userId: user.id, email: user.email, entidade: "produto", entidadeId: editing.id,
          acao: "edicao", descricao: `Produto "${form.nome_produto}" atualizado`,
          detalhes: { preco_fornecedor: form.preco_fornecedor, estoque_atual: form.estoque_atual },
        });
        toast.success("Produto atualizado!");
      } else {
        const { data: novo, error } = await supabase
          .from("produtos")
          .insert({ ...formPayload, ...imagePayload })
          .select()
          .single();
        if (error) throw error;
        await logAtividade({
          userId: user.id, email: user.email, entidade: "produto", entidadeId: novo?.id,
          acao: "criacao", descricao: `Produto "${form.nome_produto}" cadastrado`,
          detalhes: { estoque_inicial: form.estoque_inicial, preco_fornecedor: form.preco_fornecedor },
        });
        toast.success("Produto cadastrado!");
      }

      setOpen(false);
      resetForm();
      loadProdutos();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    const prod = produtos.find(p => p.id === id);
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      if (user && prod) {
        await logAtividade({
          userId: user.id, email: user.email, entidade: "produto", entidadeId: id,
          acao: "exclusao", descricao: `Produto "${prod.nome_produto}" excluído`,
        });
      }
      toast.success("Produto excluído!"); loadProdutos();
    }
  };

  const precoMargem = form.preco_fornecedor * (1 + form.margem / 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Produtos</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarImagens(!mostrarImagens)}
            className="gap-2"
          >
            {mostrarImagens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {mostrarImagens ? "Ocultar Imagens" : "Mostrar Imagens"}
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Novo Produto</Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="basico" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basico">Informações Básicas</TabsTrigger>
                  <TabsTrigger value="especificacoes">Fotos e Especificações</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basico" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Produto</Label>
                      <Input value={form.nome_produto} onChange={(e) => setForm({ ...form, nome_produto: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Gênero</Label>
                      <Select value={form.genero} onValueChange={(v) => setForm({ ...form, genero: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="unisex">Unisex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Descrição</Label>
                      <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço Fornecedor (R$)</Label>
                      <Input type="number" step="0.01" value={form.preco_fornecedor} onChange={(e) => setForm({ ...form, preco_fornecedor: +e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Margem (%)</Label>
                      <Input type="number" step="0.1" value={form.margem} onChange={(e) => setForm({ ...form, margem: +e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Taxa Débito (%)</Label>
                      <Input type="number" step="0.1" value={form.taxa_debito} onChange={(e) => setForm({ ...form, taxa_debito: +e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Taxa Crédito (%)</Label>
                      <Input type="number" step="0.1" value={form.taxa_credito} onChange={(e) => setForm({ ...form, taxa_credito: +e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Taxa Crédito 2x (%)</Label>
                      <Input type="number" step="0.1" value={form.taxa_credito_2x} onChange={(e) => setForm({ ...form, taxa_credito_2x: +e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque Inicial</Label>
                      <Input type="number" value={form.estoque_inicial} onChange={(e) => setForm({ ...form, estoque_inicial: +e.target.value, estoque_atual: editing ? form.estoque_atual : +e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque Atual</Label>
                      <Input type="number" value={form.estoque_atual} onChange={(e) => setForm({ ...form, estoque_atual: +e.target.value })} />
                    </div>
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium mb-2 text-foreground">Preços Calculados</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Com Margem:</span><br/><strong>{formatCurrency(precoMargem)}</strong></div>
                        <div><span className="text-muted-foreground">Débito:</span><br/><strong>{formatCurrency(precoMargem * (1 + form.taxa_debito / 100))}</strong></div>
                        <div><span className="text-muted-foreground">Crédito:</span><br/><strong>{formatCurrency(precoMargem * (1 + form.taxa_credito / 100))}</strong></div>
                        <div><span className="text-muted-foreground">Crédito 2x:</span><br/><strong>{formatCurrency(precoMargem * (1 + form.taxa_credito_2x / 100))}</strong></div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="especificacoes" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><ImagePlus className="w-4 h-4" /> Galeria de Imagens (Até 5)</Label>
                      <div className="flex items-center gap-2">
                        <Input type="file" accept="image/*" multiple onChange={handleImageChange} className="cursor-pointer" />
                      </div>
                      
                      {/* Galeria interativa — hover mostra coroa e X */}
                      <div className="flex flex-wrap gap-3 mt-3">

                        {/* ── Foto Principal Existente ── */}
                        {existingMainImage && (
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-primary group shadow-md flex-shrink-0">
                            <img src={existingMainImage} alt="Principal" className="w-full h-full object-cover" />
                            {/* Overlay hover */}
                            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => removeExistingImage(existingMainImage)}
                                title="Remover foto"
                                className="w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-600 flex items-center justify-center text-white transition-transform hover:scale-110 shadow-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {/* Badge principal */}
                            <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5 shadow">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                            <span className="absolute bottom-0 left-0 right-0 bg-primary/85 text-[9px] text-white text-center py-0.5 font-semibold tracking-wide">PRINCIPAL</span>
                          </div>
                        )}

                        {/* ── Galeria Existente ── */}
                        {existingGallery.map((url, i) => (
                          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-border group shadow-sm flex-shrink-0 hover:border-border/80 transition-colors">
                            <img src={url} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover" />
                            {/* Overlay hover */}
                            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => promoteExistingToMain(url)}
                                title="Definir como foto principal"
                                className="w-8 h-8 rounded-full bg-yellow-500/90 hover:bg-yellow-400 flex items-center justify-center text-white transition-transform hover:scale-110 shadow-lg"
                              >
                                <Crown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeExistingImage(url)}
                                title="Remover foto"
                                className="w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-600 flex items-center justify-center text-white transition-transform hover:scale-110 shadow-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* ── Novas Imagens (ainda não salvas) ── */}
                        {imageFiles.map((file, i) => {
                          const isChosenMain = newMainImageIndex === i;
                          return (
                            <div
                              key={`new-${i}`}
                              className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 group shadow-sm flex-shrink-0 transition-colors ${
                                isChosenMain ? "border-yellow-400 shadow-yellow-200" : "border-blue-400/60"
                              }`}
                            >
                              <img src={URL.createObjectURL(file)} alt={`Nova ${i + 1}`} className="w-full h-full object-cover" />
                              {/* Overlay hover */}
                              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                                {!isChosenMain && (
                                  <button
                                    type="button"
                                    onClick={() => promoteNewToMain(i)}
                                    title="Definir como foto principal"
                                    className="w-8 h-8 rounded-full bg-yellow-500/90 hover:bg-yellow-400 flex items-center justify-center text-white transition-transform hover:scale-110 shadow-lg"
                                  >
                                    <Crown className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeNewImage(i)}
                                  title="Remover foto"
                                  className="w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-600 flex items-center justify-center text-white transition-transform hover:scale-110 shadow-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              {/* Badges */}
                              {isChosenMain ? (
                                <>
                                  <div className="absolute top-1 left-1 bg-yellow-400 rounded-full p-0.5 shadow">
                                    <Crown className="w-3 h-3 text-white" />
                                  </div>
                                  <span className="absolute bottom-0 left-0 right-0 bg-yellow-500/90 text-[9px] text-white text-center py-0.5 font-semibold tracking-wide">PRINCIPAL</span>
                                </>
                              ) : (
                                <span className="absolute top-1 right-1 bg-blue-500/85 text-[8px] text-white px-1.5 py-0.5 rounded-full font-medium">NOVO</span>
                              )}
                            </div>
                          );
                        })}

                        {/* Dica quando há imagens */}
                        {(existingMainImage || existingGallery.length > 0 || imageFiles.length > 0) && (
                          <p className="w-full text-xs text-muted-foreground mt-1">
                            Passe o mouse sobre a foto para ver as opções — <Crown className="w-3 h-3 inline text-yellow-500" /> define como principal · <X className="w-3 h-3 inline text-red-400" /> remove
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-4 mt-2">
                      <Label className="text-lg font-semibold mb-3 block">Especificações Técnicas</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Marca</Label>
                          <Input value={specs.marca} onChange={e => setSpecs({...specs, marca: e.target.value})} placeholder="Ex: Rolex, Casio" />
                        </div>
                        <div className="space-y-2">
                          <Label>Material da Correia</Label>
                          <Input value={specs.material_correia} onChange={e => setSpecs({...specs, material_correia: e.target.value})} placeholder="Ex: Couro, Aço" />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de Fecho</Label>
                          <Input value={specs.tipo_fecho} onChange={e => setSpecs({...specs, tipo_fecho: e.target.value})} placeholder="Ex: Fivela, Borboleta" />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de Movimento</Label>
                          <Input value={specs.tipo_movimento} onChange={e => setSpecs({...specs, tipo_movimento: e.target.value})} placeholder="Ex: Quartzo, Automático" />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de Bateria</Label>
                          <Input value={specs.tipo_bateria} onChange={e => setSpecs({...specs, tipo_bateria: e.target.value})} placeholder="Ex: Íon de lítio" />
                        </div>
                        <div className="space-y-2">
                          <Label>Materiais da Caixa</Label>
                          <Input value={specs.material_caixa} onChange={e => setSpecs({...specs, material_caixa: e.target.value})} placeholder="Ex: Aço Inoxidável" />
                        </div>
                        <div className="space-y-2">
                          <Label>Forma da Caixa</Label>
                          <Input value={specs.forma_caixa} onChange={e => setSpecs({...specs, forma_caixa: e.target.value})} placeholder="Ex: Redonda, Quadrada" />
                        </div>
                        <div className="space-y-2">
                          <Label>Diâmetro do Visor</Label>
                          <Input value={specs.diametro_visor} onChange={e => setSpecs({...specs, diametro_visor: e.target.value})} placeholder="Ex: 40mm" />
                        </div>
                        <div className="space-y-2">
                          <Label>Peso</Label>
                          <Input value={specs.peso} onChange={e => setSpecs({...specs, peso: e.target.value})} placeholder="Ex: 120g" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Com calendário?</Label>
                            <Select value={specs.possui_calendario} onValueChange={(v) => setSpecs({ ...specs, possui_calendario: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Resistente à água?</Label>
                            <Select value={specs.resistente_agua} onValueChange={(v) => setSpecs({ ...specs, resistente_agua: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? "Salvando..." : editing ? "Atualizar Produto" : "Cadastrar Produto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {produtos.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            {mostrarImagens && p.imagem_url && (
              <div className="h-48 overflow-hidden bg-muted">
                <img src={p.imagem_url} alt={p.nome_produto} className="w-full h-full object-cover" />
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{p.nome_produto}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize mt-1">{p.genero}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fornecedor:</span>
                <span className="font-medium">{formatCurrency(p.preco_fornecedor)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Com Margem:</span>
                <span className="font-medium">{formatCurrency(p.preco_com_margem)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estoque:</span>
                <span className={`font-bold ${p.estoque_atual <= 0 ? "text-destructive" : p.estoque_atual <= 5 ? "text-warning" : "text-success"}`}>{p.estoque_atual}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {produtos.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum produto cadastrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
