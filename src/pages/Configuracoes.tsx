import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, Save, Smartphone, Store, Bell } from "lucide-react";

export default function Configuracoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    whatsapp: "",
    nome_loja: "Eternus Relógios",
    email_contato: "",
  });

  useEffect(() => {
    if (user) loadConfig();
  }, [user]);

  const loadConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("configuracoes")
      .select("chave, valor")
      .eq("user_id", user?.id);
    
    if (data) {
      const newConfig = { ...config };
      data.forEach(item => {
        if (item.chave in newConfig) {
          (newConfig as any)[item.chave] = item.valor;
        }
      });
      setConfig(newConfig);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const updates = Object.entries(config).map(([chave, valor]) => ({
        user_id: user.id,
        chave,
        valor,
      }));

      const { error } = await supabase
        .from("configuracoes")
        .upsert(updates, { onConflict: "user_id, chave" });

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando configurações...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Configurações do Sistema</h2>
        <p className="text-sm text-muted-foreground">Gerencie as informações gerais da sua loja.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Canais de Atendimento
            </CardTitle>
            <CardDescription>Configure como seus clientes entram em contato com você.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>WhatsApp da Loja (Somente números com DDD)</Label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-muted rounded-md border border-input text-muted-foreground text-sm">+55</span>
                <Input 
                  value={config.whatsapp} 
                  onChange={e => setConfig({...config, whatsapp: e.target.value.replace(/\D/g, "")})} 
                  placeholder="85999999999"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Este número será usado para os botões de compra e contato no site.</p>
            </div>
            <div className="space-y-2">
              <Label>E-mail de Suporte</Label>
              <Input 
                type="email" 
                value={config.email_contato} 
                onChange={e => setConfig({...config, email_contato: e.target.value})} 
                placeholder="contato@eternus.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Identidade da Loja
            </CardTitle>
            <CardDescription>Informações exibidas no cabeçalho e rodapé.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Loja</Label>
              <Input 
                value={config.nome_loja} 
                onChange={e => setConfig({...config, nome_loja: e.target.value})} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
