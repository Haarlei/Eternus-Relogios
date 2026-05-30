import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Save, Smartphone, Store, Bell, Ticket, Plus, Trash2, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Coupon {
  id: string;
  codigo: string;
  tipo: "percentual" | "fixo";
  valor: number;
  ativo: boolean;
}

export default function Configuracoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    whatsapp: "",
    nome_loja: "Eternus Relógios",
    email_contato: "",
  });
  const [cupons, setCupons] = useState<Coupon[]>([]);

  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState<Omit<Coupon, 'id'>>({
    codigo: "",
    tipo: "percentual",
    valor: 0,
    ativo: true
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
      let loadedCupons: Coupon[] = [];

      data.forEach(item => {
        if (item.chave === "cupons") {
          try {
            loadedCupons = JSON.parse(item.valor);
          } catch (e) {
            console.error("Erro ao parsear cupons:", e);
          }
        } else if (item.chave in newConfig) {
          (newConfig as any)[item.chave] = item.valor;
        }
      });
      setConfig(newConfig);
      setCupons(loadedCupons);
    }
    setLoading(false);
  };

  const handleSave = async (silent = false) => {
    if (!user) return;
    if (!silent) setSaving(true);
    
    try {
      const updates = [
        ...Object.entries(config).map(([chave, valor]) => ({
          user_id: user.id,
          chave,
          valor,
        })),
        {
          user_id: user.id,
          chave: "cupons",
          valor: JSON.stringify(cupons)
        }
      ];

      const { error } = await supabase
        .from("configuracoes")
        .upsert(updates, { onConflict: "user_id, chave" });

      if (error) throw error;
      if (!silent) toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      if (!silent) toast.error("Erro ao salvar: " + error.message);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleOpenCouponDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        codigo: coupon.codigo,
        tipo: coupon.tipo,
        valor: coupon.valor,
        ativo: coupon.ativo
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        codigo: "",
        tipo: "percentual",
        valor: 0,
        ativo: true
      });
    }
    setIsCouponDialogOpen(true);
  };

  const handleSaveCoupon = async () => {
    if (!couponForm.codigo) {
      toast.error("O código do cupom é obrigatório");
      return;
    }

    if (couponForm.valor <= 0) {
      toast.error("O valor de desconto deve ser maior que zero");
      return;
    }

    let updatedCupons = [...cupons];

    if (editingCoupon) {
      updatedCupons = updatedCupons.map(c => 
        c.id === editingCoupon.id 
          ? { ...couponForm, id: c.id, codigo: couponForm.codigo.toUpperCase().replace(/\s/g, '') } 
          : c
      );
    } else {
      // check duplicates
      if (updatedCupons.some(c => c.codigo === couponForm.codigo.toUpperCase().replace(/\s/g, ''))) {
        toast.error("Já existe um cupom com este código.");
        return;
      }
      updatedCupons.push({
        ...couponForm,
        id: Date.now().toString(),
        codigo: couponForm.codigo.toUpperCase().replace(/\s/g, '')
      });
    }

    setCupons(updatedCupons);
    setIsCouponDialogOpen(false);
    toast.success(editingCoupon ? "Cupom atualizado." : "Cupom criado.");
    
    // Auto save immediately for coupons so it persists
    const updates = [
      {
        user_id: user!.id,
        chave: "cupons",
        valor: JSON.stringify(updatedCupons)
      }
    ];
    await supabase.from("configuracoes").upsert(updates, { onConflict: "user_id, chave" });
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    const updatedCupons = cupons.filter(c => c.id !== id);
    setCupons(updatedCupons);
    toast.success("Cupom removido.");
    const updates = [
      {
        user_id: user!.id,
        chave: "cupons",
        valor: JSON.stringify(updatedCupons)
      }
    ];
    await supabase.from("configuracoes").upsert(updates, { onConflict: "user_id, chave" });
  };

  const handleToggleCouponActive = async (id: string, ativo: boolean) => {
    const updatedCupons = cupons.map(c => c.id === id ? { ...c, ativo } : c);
    setCupons(updatedCupons);
    const updates = [
      {
        user_id: user!.id,
        chave: "cupons",
        valor: JSON.stringify(updatedCupons)
      }
    ];
    await supabase.from("configuracoes").upsert(updates, { onConflict: "user_id, chave" });
  };

  if (loading) return <div className="p-8 text-center">Carregando configurações...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Configurações e Marketing</h2>
          <p className="text-sm text-muted-foreground">Gerencie informações gerais e campanhas.</p>
        </div>
        <Button onClick={() => handleSave(false)} disabled={saving} className="gap-2 px-8 shadow-md">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="geral" className="gap-2">
            <Settings className="w-4 h-4" />
            Configurações Gerais
          </TabsTrigger>
          <TabsTrigger value="cupons" className="gap-2">
            <Ticket className="w-4 h-4" />
            Cupons de Desconto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
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

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
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
        </TabsContent>

        <TabsContent value="cupons" className="space-y-6">
          <Card className="shadow-sm border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-primary">
                  <Ticket className="w-5 h-5" />
                  Gerenciamento de Cupons
                </CardTitle>
                <CardDescription>Crie cupons de desconto para seus clientes utilizarem no carrinho.</CardDescription>
              </div>
              <Button onClick={() => handleOpenCouponDialog()} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Cupom
              </Button>
            </CardHeader>
            <CardContent>
              <div className="table-responsive">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-y border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Código</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Desconto</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {cupons.map(coupon => (
                      <tr key={coupon.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-4 font-bold text-primary tracking-wider">{coupon.codigo}</td>
                        <td className="px-4 py-4 font-medium">
                          {coupon.tipo === 'percentual' ? `${coupon.valor}% OFF` : `${formatCurrency(coupon.valor)} OFF`}
                        </td>
                        <td className="px-4 py-4">
                          <Switch 
                            checked={coupon.ativo} 
                            onCheckedChange={(c) => handleToggleCouponActive(coupon.id, c)}
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenCouponDialog(coupon)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCoupon(coupon.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {cupons.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhum cupom cadastrado. Crie o primeiro cupom acima.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código do Cupom</Label>
              <Input
                id="codigo"
                placeholder="Ex: VERAO20"
                value={couponForm.codigo}
                onChange={(e) => setCouponForm({ ...couponForm, codigo: e.target.value.toUpperCase().replace(/\s/g, '') })}
                className="uppercase tracking-widest font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Desconto</Label>
                <Select
                  value={couponForm.tipo}
                  onValueChange={(val: any) => setCouponForm({ ...couponForm, tipo: val })}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor</Label>
                <Input
                  id="valor"
                  type="number"
                  step={couponForm.tipo === 'percentual' ? "1" : "0.01"}
                  placeholder={couponForm.tipo === 'percentual' ? "Ex: 10" : "Ex: 50.00"}
                  value={couponForm.valor || ""}
                  onChange={(e) => setCouponForm({ ...couponForm, valor: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex flex-row items-center justify-between rounded-lg border p-3 mt-2 shadow-sm">
              <div className="space-y-0.5">
                <Label>Cupom Ativo</Label>
                <p className="text-[12px] text-muted-foreground">Clientes poderão usá-lo imediatamente.</p>
              </div>
              <Switch
                checked={couponForm.ativo}
                onCheckedChange={(val) => setCouponForm({ ...couponForm, ativo: val })}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveCoupon}>
              {editingCoupon ? "Atualizar Cupom" : "Criar Cupom"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
