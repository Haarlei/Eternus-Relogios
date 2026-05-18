import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { 
  Trash2, Minus, Plus, ShoppingBag, CreditCard, ArrowLeft, 
  MessageCircle, LogIn, MapPin, Search, Loader2,
  QrCode, Copy, Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WHATSAPP = "5585987939498";

async function getFunctionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Erro ao chamar a Edge Function.";
  const response = (error as any)?.context;

  if (!response || typeof response.clone !== "function") {
    return fallback;
  }

  const payload = await response.clone().json().catch(() => null);
  return payload?.error || payload?.message || fallback;
}

interface AddressData {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cpf: string;
}

export default function Cart() {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [address, setAddress] = useState<AddressData>({
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cpf: ""
  });
  const [pixData, setPixData] = useState<{ code: string; image: string; orderId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Pre-fill address if user has it
  useEffect(() => {
    if (user?.endereco) {
      const e = user.endereco as any;
      setAddress({
        cep: e.cep || "",
        rua: e.rua || "",
        numero: e.numero || "",
        complemento: e.complemento || "",
        bairro: e.bairro || "",
        cidade: e.cidade || "",
        estado: e.estado || "",
        cpf: e.cpf || ""
      });
    }
  }, [user]);

  // Trigger lookup automatically when CEP is 8 digits (sanitized)
  useEffect(() => {
    const cleanCEP = address.cep.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      handleLookupCEP(cleanCEP);
    }
  }, [address.cep]);

  const handleLookupCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    setLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setAddress(prev => ({
        ...prev,
        cep: cleanCEP,
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      }));
      
      toast.success("Endereço preenchido! Informe o número.");
    } catch (err) {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setLoadingCEP(false);
    }
  };

  const handleFinalizeCheckout = async () => {
    if (!user) {
      return navigate("/entrar", { state: { redirect: "/carrinho" } });
    }

    if (!address.cep || !address.rua || !address.numero || !address.bairro || !address.cidade) {
      toast.error("Por favor, preencha todos os campos de entrega.");
      return;
    }

    setIsCheckingOut(true);
    try {
      await updateProfile({ endereco: address });

      const itens = items.map(item => ({
        nome_produto: item.nome_produto,
        quantidade: item.quantidade,
        preco: item.preco,
        produto_id: item.id,
      }));

      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          user_id: user.id,
          status: "Aguardando Pagamento",
          metodo_pagamento: "WhatsApp",
          total: totalPrice,
          itens,
          endereco_entrega: {
            cliente: {
              nome: user.nome,
              email: user.email,
              telefone: user.telefone,
            },
            endereco: {
              zip_code: address.cep,
              street: address.rua,
              number: address.numero,
              complement: address.complemento,
              neighborhood: address.bairro,
              city: address.cidade,
              state: address.estado,
            }
          },
        })
        .select("id")
        .single();

      if (pedidoError) throw new Error(pedidoError.message);

      const orderId = pedido.id.slice(0, 8).toUpperCase();
      let message = `*📦 NOVO PEDIDO - #${orderId}*\n`;
      message += `------------------------------------------\n\n`;
      
      message += `*👤 CLIENTE*\n`;
      message += `Nome: ${user.nome}\n`;
      message += `Tel: ${user.telefone}\n\n`;

      message += `*🛍️ ITENS*\n`;
      items.forEach((item) => {
        message += `• ${item.quantidade}x ${item.nome_produto} - ${formatCurrency(item.preco * item.quantidade)}\n`;
      });
      message += `\n*💰 TOTAL: ${formatCurrency(totalPrice)}*\n\n`;

      message += `*📍 ENDEREÇO DE ENTREGA*\n`;
      message += `${address.rua}, ${address.numero}\n`;
      if (address.complemento) message += `Comp: ${address.complemento}\n`;
      message += `${address.bairro} - ${address.cidade}/${address.estado}\n`;
      message += `CEP: ${address.cep}\n\n`;

      message += `------------------------------------------\n`;
      message += `_Olá! Acabei de fazer meu pedido no site. Como posso realizar o pagamento?_`;

      clearCart();
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
      toast.success("Pedido enviado com sucesso!");
      navigate("/perfil");
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar pedido.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleAsaasCheckout = async (billingType: "PIX" | "CREDIT_CARD") => {
    if (!user) {
      return navigate("/entrar", { state: { redirect: "/carrinho" } });
    }

    if (!address.cep || !address.rua || !address.numero || !address.bairro || !address.cidade) {
      toast.error("Por favor, preencha todos os campos de entrega.");
      return;
    }

    if (!address.cpf.replace(/\D/g, "")) {
      toast.error("Informe o CPF para processar o pagamento.");
      return;
    }

    setIsCheckingOut(true);
    try {
      await updateProfile({ endereco: address });

      const itens = items.map(item => ({
        nome_produto: item.nome_produto,
        quantidade: item.quantidade,
        preco: item.preco,
        produto_id: item.id,
      }));

      const enderecoEntrega = {
        cliente: {
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          cpf: address.cpf,
        },
        endereco: {
          zip_code: address.cep,
          street: address.rua,
          number: address.numero,
          complement: address.complemento,
          neighborhood: address.bairro,
          city: address.cidade,
          state: address.estado,
        }
      };

      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          user_id: user.id,
          status: "Aguardando Pagamento",
          metodo_pagamento: billingType === "PIX" ? "Online (Asaas)" : "Online (Asaas)", // Both tracked similarly, we could differentiate later
          total: totalPrice,
          itens,
          endereco_entrega: enderecoEntrega,
        })
        .select("id")
        .single();

      if (pedidoError) throw new Error(pedidoError.message);

      const redirectUrl = `${window.location.origin}/pagamento-concluido?order_id=${pedido.id}`;
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke("create_asaas_payment", {
        body: {
          amount: totalPrice,
          orderId: pedido.id,
          redirectUrl,
          billingType,
          customer: {
            id: user.id,
            name: user.nome,
            email: user.email,
            phone: user.telefone,
            cpf: address.cpf,
            address,
          },
        },
      });

      if (paymentError) throw new Error(await getFunctionErrorMessage(paymentError));
      if (paymentData?.error) throw new Error(paymentData.error);
      if (!paymentData?.invoiceUrl) throw new Error("O Asaas nao retornou o link de pagamento.");

      await supabase
        .from("pedidos")
        .update({
          checkout_url: paymentData.invoiceUrl,
          order_nsu: paymentData.paymentId,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", pedido.id);

      if (billingType === "CREDIT_CARD") {
        clearCart();
        toast.success("Redirecionando para o pagamento seguro...");
        window.location.href = paymentData.invoiceUrl;
      } else {
        // Show PIX Modal
        if (!paymentData.pixCode) throw new Error("Erro ao gerar QR Code PIX.");
        setPixData({
          code: paymentData.pixCode,
          image: paymentData.pixImage,
          orderId: pedido.id
        });
        clearCart();
        toast.success("Pedido gerado! Realize o pagamento PIX.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar pagamento Asaas.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Explore nossa coleção e encontre o relógio perfeito para você.
        </p>
        <Button size="lg" onClick={() => navigate("/")} className="rounded-2xl px-8">
          Ver produtos
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 max-w-6xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight font-serif-elegant">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 md:p-8 rounded-3xl border border-border bg-card shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Dados de Entrega
            </h2>

            <div className="grid gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      placeholder="00000-000"
                      value={address.cep}
                      onChange={(e) => setAddress({ ...address, cep: e.target.value })}
                      className="rounded-xl"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleLookupCEP(address.cep)}
                      disabled={loadingCEP}
                      className="rounded-xl"
                    >
                      {loadingCEP ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={address.cpf}
                    onChange={(e) => setAddress({ ...address, cpf: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rua">Rua / Logradouro</Label>
                <Input
                  id="rua"
                  value={address.rua}
                  onChange={(e) => setAddress({ ...address, rua: e.target.value })}
                  placeholder="Ex: Av. Principal"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={address.numero}
                    onChange={(e) => setAddress({ ...address, numero: e.target.value })}
                    placeholder="123"
                    className="rounded-xl border-primary/40 focus:border-primary"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={address.bairro}
                    onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
                    placeholder="Ex: Centro"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={address.cidade}
                    onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
                    className="rounded-xl bg-muted/50"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">UF</Label>
                  <Input
                    id="estado"
                    value={address.estado}
                    onChange={(e) => setAddress({ ...address, estado: e.target.value })}
                    className="rounded-xl bg-muted/50"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento (Opcional)</Label>
                <Input
                  id="complemento"
                  value={address.complemento}
                  onChange={(e) => setAddress({ ...address, complemento: e.target.value })}
                  placeholder="Apto, Bloco, Ponto de Referência"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="p-6 md:p-8 rounded-3xl border border-border bg-card shadow-xl sticky top-24">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Resumo</h2>
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground hover:text-destructive">
                Limpar
              </Button>
            </div>
            
            <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center group">
                  <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.imagem_url || ""} alt={item.nome_produto} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-1">{item.nome_produto}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQuantity(item.id, item.quantidade - 1)} className="p-0.5 hover:bg-muted rounded"><Minus className="w-3 h-3"/></button>
                      <span className="text-xs font-bold">{item.quantidade}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantidade + 1)} className="p-0.5 hover:bg-muted rounded"><Plus className="w-3 h-3"/></button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(item.preco * item.quantidade)}</p>
                    <button onClick={() => removeItem(item.id)} className="text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">Remover</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-border pt-4 mb-6">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Frete</span>
                <span className="text-green-600 font-medium">A combinar</span>
              </div>
              <div className="flex justify-between items-center pt-2 text-lg font-bold">
                <span>Total</span>
                <span className="text-2xl text-primary font-black">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg shadow-green-500/20 transition-all hover:-translate-y-1 active:scale-[0.98]"
              onClick={handleFinalizeCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <MessageCircle className="w-6 h-6 mr-2" />
                  Finalizar via WhatsApp
                </>
              )}
            </Button>

            <Button
              size="lg"
              className="w-full h-14 mt-3 rounded-2xl bg-[#00B4D8] hover:bg-[#0096C7] text-white font-bold text-lg shadow-lg shadow-[#00B4D8]/20 transition-all hover:-translate-y-1 active:scale-[0.98]"
              onClick={() => handleAsaasCheckout("PIX")}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <QrCode className="w-6 h-6 mr-2" />
                  Pagar via PIX
                </>
              )}
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 mt-3 rounded-2xl font-bold text-lg transition-all hover:-translate-y-1 active:scale-[0.98]"
              onClick={() => handleAsaasCheckout("CREDIT_CARD")}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-6 h-6 mr-2" />
                  Pagar com Cartão
                </>
              )}
            </Button>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span>Pagamento seguro via PIX ou Link de Cartão</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!pixData} onOpenChange={(open) => {
        if (!open) {
          setPixData(null);
          navigate("/perfil");
        }
      }}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <QrCode className="w-6 h-6 text-[#00B4D8]" />
              Pagamento via PIX
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Abra o aplicativo do seu banco e escaneie o QR Code abaixo para finalizar seu pedido.
            </DialogDescription>
          </DialogHeader>

          {pixData && (
            <div className="flex flex-col items-center justify-center space-y-6 py-4">
              <div className="bg-white p-4 rounded-3xl border border-border shadow-sm">
                <img 
                  src={`data:image/png;base64,${pixData.image}`} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 object-contain"
                />
              </div>

              <div className="w-full space-y-2">
                <p className="text-sm font-medium text-muted-foreground text-left">Ou copie o código PIX (Pix Copia e Cola):</p>
                <div className="flex items-center space-x-2">
                  <Input 
                    value={pixData.code} 
                    readOnly 
                    className="font-mono text-xs text-muted-foreground bg-muted/50 rounded-xl"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0 rounded-xl"
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.code);
                      setCopied(true);
                      toast.success("Código PIX copiado!");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button 
              size="lg" 
              className="w-full rounded-xl bg-green-600 hover:bg-green-700"
              onClick={() => {
                setPixData(null);
                navigate(`/pagamento-concluido?order_id=${pixData?.orderId}`);
              }}
            >
              Já realizei o pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
