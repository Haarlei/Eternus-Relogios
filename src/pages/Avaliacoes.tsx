import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit2, Plus, Star, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { logAtividade } from "@/lib/logger";

interface Avaliacao {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string | null;
  imagem_url: string | null;
  estrelas: number;
  criado_em: string;
}

export default function Avaliacoes() {
  const { user } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [estrelas, setEstrelas] = useState(5);
  const [imagem, setImagem] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAvaliacoes();
  }, []);

  const fetchAvaliacoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("avaliacoes")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar avaliações");
    } else {
      setAvaliacoes(data || []);
    }
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagem(file);
      setImagemPreview(URL.createObjectURL(file));
    }
  };

  const clearForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setTitulo("");
    setMensagem("");
    setEstrelas(5);
    setImagem(null);
    setImagemPreview(null);
    const fileInput = document.getElementById("imagem-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleEdit = (a: Avaliacao) => {
    setIsEditing(true);
    setCurrentId(a.id);
    setTitulo(a.titulo);
    setMensagem(a.mensagem || "");
    setEstrelas(a.estrelas);
    setImagem(null);
    setImagemPreview(a.imagem_url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm("Tem certeza que deseja excluir esta avaliação?")) return;

    const { error } = await supabase.from("avaliacoes").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir avaliação");
    } else {
      toast.success("Avaliação excluída com sucesso");
      if (user) {
        await logAtividade({
          userId: user.id, email: user.email, entidade: "avaliacao", entidadeId: id,
          acao: "exclusao", descricao: `Avaliação excluída: ${titulo}`
        });
      }
      fetchAvaliacoes();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!titulo.trim()) return toast.error("O título é obrigatório");
    if (estrelas < 1 || estrelas > 5) return toast.error("As estrelas devem ser entre 1 e 5");
    
    if (!mensagem.trim() && !imagem && !imagemPreview) {
      return toast.error("A avaliação deve ter uma mensagem ou uma imagem.");
    }

    setUploading(true);
    let uploadedUrl = imagemPreview;

    if (imagem) {
      const fileExt = imagem.name.split('.').pop();
      const fileName = `avaliacao_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('produtos') // Reusing the same storage bucket or create a new one? Let's use 'produtos' for now or 'avaliacoes'. We might need to ensure 'avaliacoes' exists. Actually, standard is 'produtos' bucket is already public.
        .upload(filePath, imagem);

      if (uploadError) {
        toast.error("Erro ao fazer upload da imagem");
        setUploading(false);
        return;
      }

      const { data: publicUrl } = supabase.storage.from('produtos').getPublicUrl(filePath);
      uploadedUrl = publicUrl.publicUrl;
    }

    const payload = {
      user_id: user.id,
      titulo,
      mensagem: mensagem.trim() || null,
      imagem_url: uploadedUrl || null,
      estrelas
    };

    if (isEditing && currentId) {
      const { error } = await supabase.from("avaliacoes").update(payload).eq("id", currentId);
      if (error) {
        toast.error("Erro ao atualizar avaliação");
      } else {
        toast.success("Avaliação atualizada!");
        await logAtividade({
          userId: user.id, email: user.email, entidade: "avaliacao", entidadeId: currentId,
          acao: "edicao", descricao: `Avaliação editada: ${titulo}`
        });
        clearForm();
        fetchAvaliacoes();
      }
    } else {
      const { data, error } = await supabase.from("avaliacoes").insert([payload]).select().single();
      if (error) {
        toast.error("Erro ao cadastrar avaliação");
      } else {
        toast.success("Avaliação cadastrada!");
        await logAtividade({
          userId: user.id, email: user.email, entidade: "avaliacao", entidadeId: data.id,
          acao: "criacao", descricao: `Nova avaliação criada: ${titulo}`
        });
        clearForm();
        fetchAvaliacoes();
      }
    }
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            {isEditing ? "Editar Avaliação" : "Nova Avaliação"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título (Ex: Cliente Satisfeito, João da Silva)</Label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título da avaliação" required />
              </div>
              <div className="space-y-2">
                <Label>Estrelas (1 a 5)</Label>
                <Input type="number" min="1" max="5" value={estrelas} onChange={e => setEstrelas(parseInt(e.target.value) || 5)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mensagem do Cliente</Label>
              <Textarea 
                value={mensagem} 
                onChange={e => setMensagem(e.target.value)} 
                placeholder="Escreva a mensagem do cliente aqui..." 
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem (Print do WhatsApp ou Foto do Cliente)</Label>
              <div className="flex items-center gap-4">
                <Input id="imagem-upload" type="file" accept="image/*" onChange={handleImageChange} className="max-w-md" />
                {imagemPreview && (
                  <div className="relative">
                    <img src={imagemPreview} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-border" />
                    <button type="button" onClick={() => { setImagem(null); setImagemPreview(null); (document.getElementById("imagem-upload") as HTMLInputElement).value = ""; }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={uploading}>
                {uploading ? "Salvando..." : isEditing ? "Atualizar Avaliação" : "Cadastrar Avaliação"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={clearForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Avaliações Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : avaliacoes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma avaliação encontrada.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {avaliacoes.map(av => (
                <div key={av.id} className="border border-border p-4 rounded-lg bg-card shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg line-clamp-1" title={av.titulo}>{av.titulo}</h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(av)} className="h-8 w-8 p-0">
                        <Edit2 className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(av.id, av.titulo)} className="h-8 w-8 p-0">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < av.estrelas ? "fill-current" : "text-muted"}`} />
                    ))}
                  </div>

                  {av.mensagem && (
                    <p className="text-sm text-muted-foreground line-clamp-3" title={av.mensagem}>{av.mensagem}</p>
                  )}

                  {av.imagem_url && (
                    <div className="mt-2">
                      <img src={av.imagem_url} alt="Avaliação" className="h-32 w-full object-cover rounded-md border border-border" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
