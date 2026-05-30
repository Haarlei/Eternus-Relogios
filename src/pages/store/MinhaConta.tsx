import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  User, Package, LogOut, ChevronRight, Clock, CheckCircle2,
  Truck, Box, ShoppingBag, AlertCircle, CreditCard, MessageCircle, LayoutDashboard, Edit2, Phone, Mail, Loader2, QrCode, Copy, Check, Star, X, Image as ImageIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { maskPhone, unmaskValue } from "@/lib/masks";

interface PedidoItem {
  nome_produto: string;
  quantidade: number;
  preco: number;
  produto_id: string;
}

interface Pedido {
  id: string;
  status: string;
  metodo_pagamento: string;
  total: number;
  itens: PedidoItem[];
  criado_em: string;
  checkout_url: string | null;
  order_nsu: string | null;
  endereco_entrega: any;
  motivo_cancelamento?: string | null;
}

// Status timeline for order tracking
const STATUS_STEPS = [
  { key: "Aguardando Pagamento", label: "Aguardando Pagamento", icon: Clock },
  { key: "Pago", label: "Pagamento Confirmado", icon: CheckCircle2 },
  { key: "Em Embalagem", label: "Em Embalagem", icon: Box },
  { key: "Enviado aos Correios", label: "Enviado aos Correios", icon: Truck },
  { key: "Entregue", label: "Entregue!", icon: CheckCircle2 },
];

function OrderTimeline({ status }: { status: string }) {
  const currentIndex = STATUS_STEPS.findIndex(s => s.key === status);
  const isCancelled = status === "Cancelado";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm font-medium mt-3">
        <AlertCircle className="w-4 h-4" />
        Pedido Cancelado
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-start gap-0">
        {STATUS_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                <div className={`flex-1 h-[2px] ${idx === 0 ? "invisible" : isActive ? "bg-primary" : "bg-border"}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${isActive ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"} ${isCurrent ? "ring-2 ring-primary/30 ring-offset-2" : ""}`}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <div className={`flex-1 h-[2px] ${idx === STATUS_STEPS.length - 1 ? "invisible" : isActive && idx < currentIndex ? "bg-primary" : "bg-border"}`} />
              </div>
              <span className={`text-[9px] mt-1.5 text-center leading-tight max-w-[60px] ${isCurrent ? "text-primary font-bold" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditProfileDialog({ user, onUpdate }: { user: any, onUpdate: (updates: any) => Promise<void> }) {
  const [nome, setNome] = useState(user?.nome || "");
  const [telefone, setTelefone] = useState(user?.telefone || "");
  const [endereco, setEndereco] = useState(user?.endereco || {
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: ""
  });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);

  // Trigger lookup automatically when CEP is 8 digits (sanitized)
  useEffect(() => {
    const cleanCEP = endereco.cep.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      handleLookupCEP(cleanCEP);
    }
  }, [endereco.cep]);

  const handleLookupCEP = async (cepValue: string) => {
    const cleanCEP = cepValue.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    setLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setEndereco(prev => ({
        ...prev,
        cep: cleanCEP,
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      }));
      toast.success("Endereço preenchido automaticamente!");
    } catch (err) {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setLoadingCEP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate({ 
        nome, 
        telefone: unmaskValue(telefone),
        endereco 
      });
      toast.success("Perfil atualizado!");
      setOpen(false);
    } catch (err) {
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full border-primary/20 hover:bg-primary/5">
          <Edit2 className="w-3.5 h-3.5" />
          Editar Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-elegant text-2xl">Editar Informações</DialogTitle>
          <DialogDescription>
            Mantenha seus dados sempre atualizados para facilitar suas compras.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Básico</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input
                  id="edit-name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">WhatsApp</Label>
                <Input
                  id="edit-phone"
                  value={maskPhone(telefone)}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
            </div>

            {/* Address Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Endereço</h3>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={endereco.cep}
                    onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })}
                    placeholder="00000-000"
                    maxLength={10}
                  />
                  {loadingCEP && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-primary" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rua">Rua</Label>
                <Input
                  id="rua"
                  value={endereco.rua}
                  onChange={(e) => setEndereco({...endereco, rua: e.target.value})}
                  placeholder="Rua..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={endereco.numero}
                onChange={(e) => setEndereco({...endereco, numero: e.target.value})}
                placeholder="123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={endereco.bairro}
                onChange={(e) => setEndereco({...endereco, bairro: e.target.value})}
                placeholder="Centro"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={endereco.cidade} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">UF</Label>
              <Input id="estado" value={endereco.estado} disabled className="bg-muted/50" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              value={endereco.complemento}
              onChange={(e) => setEndereco({...endereco, complemento: e.target.value})}
              placeholder="Apto, Bloco, etc."
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold">
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MinhaConta() {
  const { user, signOut, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // Pix Modal States
  const [pixData, setPixData] = useState<{
    code: string;
    image: string;
    pedido: Pedido;
  } | null>(null);
  const [loadingPix, setLoadingPix] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Transparent Credit Card States
  const [showCardModal, setShowCardModal] = useState(false);
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedPedidoForCard, setSelectedPedidoForCard] = useState<Pedido | null>(null);
  const [cardData, setCardData] = useState({
    number: "",
    holder: "",
    expiry: "",
    cvv: "",
    cpf: "",
    installments: "1"
  });

  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, "");
    if (clean.startsWith("4")) return "visa";
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(clean)) return "mastercard";
    if (/^(34|37)/.test(clean)) return "amex";
    if (/^(30[0-5]|36|38)/.test(clean)) return "diners";
    if (/^(6011|622|64|65)/.test(clean)) return "discover";
    if (/^(50|63|65)/.test(clean)) return "elo";
    return "neutral";
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, "").slice(0, 16);
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2)}`;
    }
    return v;
  };

  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 9) {
      return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
    } else if (v.length > 6) {
      return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    } else if (v.length > 3) {
      return `${v.slice(0, 3)}.${v.slice(3)}`;
    }
    return v;
  };

  // States for Review Modal
  const [selectedProduct, setSelectedProduct] = useState<PedidoItem | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // States for Cancel Order Modal
  const [pedidoToCancel, setPedidoToCancel] = useState<Pedido | null>(null);
  const [selectedReasonOption, setSelectedReasonOption] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!pedidoToCancel) return;
    if (!selectedReasonOption) {
      toast.error("Por favor, selecione um motivo para o cancelamento.");
      return;
    }
    const finalReason = selectedReasonOption === "Outros" ? cancelReason.trim() : selectedReasonOption;
    if (selectedReasonOption === "Outros" && !finalReason) {
      toast.error("Por favor, descreva o motivo do cancelamento.");
      return;
    }
    
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({
          status: "Cancelado",
          motivo_cancelamento: finalReason,
          atualizado_em: new Date().toISOString()
        })
        .eq("id", pedidoToCancel.id);

      if (error) throw error;
      
      toast.success("Pedido cancelado com sucesso.");
      setPedidoToCancel(null);
      setSelectedReasonOption("");
      setCancelReason("");
      loadPedidos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar pedido.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReviewImage(file);
      setReviewImagePreview(URL.createObjectURL(file));
    }
  };

  const handleOpenReviewModal = (pedido: Pedido, item: PedidoItem) => {
    setSelectedProduct(item);
    setReviewTitle(user?.nome || "");
    setReviewMessage("");
    setReviewStars(5);
    setReviewImage(null);
    setReviewImagePreview(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;
    if (!reviewTitle.trim()) return toast.error("Seu nome é obrigatório");
    if (reviewStars < 1 || reviewStars > 5) return toast.error("As estrelas devem ser entre 1 e 5");

    setSubmittingReview(true);
    let uploadedUrl = null;

    try {
      if (reviewImage) {
        const fileExt = reviewImage.name.split('.').pop();
        const fileName = `avaliacao_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(filePath, reviewImage);

        if (uploadError) {
          throw new Error("Erro ao fazer upload da imagem.");
        }

        const { data: publicUrl } = supabase.storage.from('produtos').getPublicUrl(filePath);
        uploadedUrl = publicUrl.publicUrl;
      }

      const { error } = await supabase.from("avaliacoes").insert([
        {
          user_id: user.id,
          titulo: reviewTitle,
          mensagem: reviewMessage.trim() || null,
          imagem_url: uploadedUrl,
          estrelas: reviewStars,
          produto_id: selectedProduct.produto_id
        }
      ]);

      if (error) throw error;

      toast.success("Avaliação enviada com sucesso! Obrigado.");
      setSelectedProduct(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar avaliação.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Timer for expiration
  useEffect(() => {
    if (!pixData?.pedido?.criado_em) return;

    const creationTime = new Date(pixData.pedido.criado_em).getTime();
    const expirationTime = creationTime + 10 * 60 * 1000; // 10 minutes

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expirationTime - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft("Expirado");
        
        supabase.from("pedidos").delete().eq("id", pixData.pedido.id).then(() => {
          toast.error("Tempo esgotado! O pedido foi excluído.");
          setPixData(null);
          loadPedidos();
        });

        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [pixData?.pedido?.criado_em]);

  // Real-time listener for PIX payment confirmation
  useEffect(() => {
    if (!pixData?.pedido.id) return;

    const channel = supabase
      .channel(`minhaconta_payment_status_${pixData.pedido.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos",
          filter: `id=eq.${pixData.pedido.id}`,
        },
        (payload) => {
          if (payload.new.status === "Pago") {
            toast.success("Pagamento confirmado!");
            setPixData(null);
            loadPedidos();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pixData?.pedido.id]);

  const handleResumePix = async (pedido: Pedido) => {
    const billingType = (pedido.endereco_entrega as any)?.billing_type;

    if (billingType === "CREDIT_CARD") {
      const clientCpf = (pedido.endereco_entrega as any)?.cliente?.cpf || "";
      setCardData({
        number: "",
        holder: user?.nome || "",
        expiry: "",
        cvv: "",
        cpf: formatCPF(clientCpf),
        installments: "1"
      });
      setSelectedPedidoForCard(pedido);
      setShowCardModal(true);
      return;
    }

    if (!pedido.order_nsu) {
      window.location.href = pedido.checkout_url || "";
      return;
    }
    setLoadingPix(pedido.id);
    try {
      const { data, error } = await supabase.functions.invoke("get_asaas_pix_qrcode", {
        body: { paymentId: pedido.order_nsu }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPixData({
        code: data.pixCode,
        image: data.pixImage,
        pedido
      });
    } catch (err: any) {
      // Fallback robusto: se falhar em carregar o modal de PIX por qualquer motivo, redireciona o cliente para a tela oficial do Asaas
      if (pedido.checkout_url) {
        window.location.href = pedido.checkout_url;
      } else {
        toast.error(err.message || "Erro ao recuperar código PIX.");
      }
    } finally {
      setLoadingPix(null);
    }
  };

  const handleCreditCardPayment = async () => {
    if (!selectedPedidoForCard) return;
    if (!cardData.number || !cardData.holder || !cardData.expiry || !cardData.cvv || !cardData.cpf) {
      toast.error("Por favor, preencha todos os campos do cartão.");
      return;
    }

    setIsProcessingCard(true);
    try {
      const [expiryMonth, expiryYear] = cardData.expiry.split("/");
      if (!expiryMonth || !expiryYear || expiryMonth.length !== 2 || expiryYear.length !== 2) {
        throw new Error("Validade do cartão inválida. Use o formato MM/AA.");
      }

      const clientInfo = (selectedPedidoForCard.endereco_entrega as any)?.cliente || {};
      const addressInfo = (selectedPedidoForCard.endereco_entrega as any)?.endereco || {};

      const redirectUrl = `${window.location.origin}/pagamento-concluido?order_id=${selectedPedidoForCard.id}`;
      
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke("create_asaas_payment", {
        body: {
          amount: selectedPedidoForCard.total,
          orderId: selectedPedidoForCard.id,
          redirectUrl,
          billingType: "CREDIT_CARD",
          customer: {
            id: user!.id,
            name: clientInfo.nome || user!.nome,
            email: clientInfo.email || user!.email,
            phone: clientInfo.telefone || user!.telefone || "85999999999",
            cpf: clientInfo.cpf || cardData.cpf.replace(/\D/g, ""),
            address: {
              cep: addressInfo.zip_code || "60000000",
              rua: addressInfo.street || "Rua Teste",
              numero: addressInfo.number || "123",
              complemento: addressInfo.complement,
              bairro: addressInfo.neighborhood || "Centro",
              cidade: addressInfo.city || "Fortaleza",
              estado: addressInfo.state || "CE"
            },
          },
          creditCard: {
            holderName: cardData.holder.trim(),
            number: cardData.number.replace(/\s+/g, ""),
            expiryMonth,
            expiryYear: "20" + expiryYear,
            ccv: cardData.cvv,
          },
          creditCardHolderInfo: {
            name: cardData.holder.trim(),
            email: user!.email,
            cpfCnpj: cardData.cpf.replace(/\D/g, ""),
            postalCode: (addressInfo.zip_code || "60000000").replace(/\D/g, ""),
            addressNumber: addressInfo.number || "123",
            phone: (clientInfo.telefone || user!.telefone || "85999999999").replace(/\D/g, ""),
            installmentCount: Number(cardData.installments),
          }
        },
      });

      if (paymentError) throw new Error(paymentError.message || "Erro ao conectar ao Asaas");
      if (paymentData?.error) throw new Error(paymentData.error);

      await supabase
        .from("pedidos")
        .update({
          checkout_url: paymentData.invoiceUrl,
          order_nsu: paymentData.paymentId,
          status: "Pago",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", selectedPedidoForCard.id);

      toast.success("Pagamento aprovado com sucesso!");
      setShowCardModal(false);
      loadPedidos();
    } catch (err: any) {
      toast.error(err.message || "Falha ao processar pagamento com cartão.");
    } finally {
      setIsProcessingCard(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/entrar", { state: { redirect: "/minha-conta" } });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadPedidos();
    }
  }, [user]);

  const loadPedidos = async () => {
    setLoadingPedidos(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, status, metodo_pagamento, total, itens, criado_em, checkout_url, order_nsu, endereco_entrega")
      .eq("user_id", user!.id)
      .order("criado_em", { ascending: false });

    if (!error && data) {
      const validPedidos = [];
      const now = new Date().getTime();

      for (const pedido of data) {
        const isPixOrOnline = pedido.metodo_pagamento === "PIX" || pedido.metodo_pagamento === "Online (Asaas)";
        if (pedido.status === "Aguardando Pagamento" && isPixOrOnline) {
          const creationTime = new Date(pedido.criado_em).getTime();
          if (now - creationTime > 10 * 60 * 1000) {
            // Delete expired order
            await supabase.from("pedidos").delete().eq("id", pedido.id);
            continue;
          }
        }
        validPedidos.push(pedido);
      }
      setPedidos(validPedidos as unknown as Pedido[]);
    }
    setLoadingPedidos(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Até logo!");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-32 pb-12 max-w-4xl">
      {/* Header do Perfil */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-serif-elegant tracking-wide">
              {user?.nome || "Minha Conta"}
            </h1>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="w-3 h-3" />
                {user?.email}
              </p>
              {user?.telefone && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  {maskPhone(user.telefone)}
                </p>
              )}
            </div>
            <div className="mt-3">
              <EditProfileDialog user={user} onUpdate={updateProfile} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user?.is_admin && (
            <Button 
              onClick={() => navigate("/dashboard")} 
              className="gap-2 rounded-full bg-foreground text-background hover:bg-primary hover:text-white transition-all shadow-lg"
            >
              <LayoutDashboard className="w-4 h-4" />
              Painel Administrativo
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2 rounded-full">
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <Link to="/colecao" className="p-5 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all group flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Explorar</p>
            <p className="font-semibold mt-1">Coleção</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
        <Link to="/carrinho" className="p-5 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all group flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Compras</p>
            <p className="font-semibold mt-1">Meu Carrinho</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Histórico de Pedidos */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Meus Pedidos</h2>
        </div>

        {loadingPedidos ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Você ainda não fez nenhum pedido.</p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate("/colecao")}>
              Explorar a Coleção
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map(pedido => (
              <div key={pedido.id} className="p-5 rounded-2xl border border-border bg-card">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Pedido #{pedido.id.slice(0, 8).toUpperCase()} · {pedido.metodo_pagamento}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(pedido.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">{formatCurrency(pedido.total)}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-1">
                  {(pedido.itens as PedidoItem[]).map((item, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {item.quantidade}x {item.nome_produto} — {formatCurrency(item.preco)}
                    </p>
                  ))}
                </div>

                {/* Timeline de Status */}
                <OrderTimeline status={pedido.status} />

                {/* Botão Retomar Pagamento Online */}
                {pedido.status === "Aguardando Pagamento" && pedido.metodo_pagamento !== "WhatsApp" && pedido.checkout_url && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={() => handleResumePix(pedido)}
                      disabled={loadingPix === pedido.id}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-all duration-300 h-auto"
                    >
                      {loadingPix === pedido.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <QrCode className="w-3.5 h-3.5" />
                      )}
                      Retomar Pagamento
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2">Clique para ver o QR Code ou ser redirecionado para concluir.</p>
                  </div>
                )}

                {/* Botão Continuar pelo WhatsApp */}
                {pedido.status === "Aguardando Pagamento" && pedido.metodo_pagamento === "WhatsApp" && (() => {
                  const itensList = (pedido.itens as PedidoItem[])
                    .map((item, i) => `${i + 1}. *${item.nome_produto}* (${item.quantidade}x)`)
                    .join("\n");
                  const msg = `Olá! Meu pedido #${pedido.id.slice(0, 8).toUpperCase()} ainda está aguardando pagamento.\n\nItens:\n${itensList}\n\nTotal: R$${pedido.total.toFixed(2).replace(".", ",")}\n\nGostaria de concluir a compra!`;
                  return (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <a
                        href={`https://wa.me/5585987939498?text=${encodeURIComponent(msg)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20 text-xs font-bold uppercase tracking-wider hover:bg-green-500 hover:text-white transition-all duration-300"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Continuar no WhatsApp
                      </a>
                      <p className="text-[10px] text-muted-foreground mt-2">Clique para retomar a negociação com a nossa equipe.</p>
                    </div>
                  );
                })()}

                {/* Botão Cancelar Pedido */}
                {pedido.status === "Aguardando Pagamento" && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPedidoToCancel(pedido);
                        setCancelReason("");
                        setSelectedReasonOption("");
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold uppercase tracking-wider hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 w-full md:w-auto"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancelar Pedido
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2">Se desistiu da compra, você pode cancelá-la.</p>
                  </div>
                )}

                {/* Botão Avaliar Produto se status for Entregue */}
                {pedido.status === "Entregue" && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                      Avaliar sua compra
                    </p>
                    <div className="flex flex-col gap-2">
                      {(pedido.itens as PedidoItem[]).map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-muted/10 p-3 rounded-xl border border-border/50">
                          <span className="text-sm font-medium">{item.nome_produto}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReviewModal(pedido, item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-primary/20 bg-primary/5 text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          >
                            Avaliar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!pixData} onOpenChange={(open) => !open && setPixData(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-center">
              <QrCode className="w-6 h-6 text-[#00B4D8]" />
              Pagamento via PIX
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Finalize seu pedido #{pixData?.pedido.id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {pixData && (
            <div className="flex flex-col items-center justify-center space-y-6 py-4">
              
              {/* Detalhes da Compra */}
              <div className="w-full bg-muted/30 p-4 rounded-2xl border border-border">
                <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">Resumo da Compra</h3>
                <div className="space-y-2 mb-3 max-h-[120px] overflow-y-auto">
                  {(pixData.pedido.itens as PedidoItem[]).map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="font-medium line-clamp-1 flex-1 pr-4">
                        {item.quantidade}x {item.nome_produto}
                      </span>
                      <span className="text-muted-foreground">{formatCurrency(item.preco * item.quantidade)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border/50 font-bold">
                  <span>Total</span>
                  <span className="text-lg text-primary">{formatCurrency(pixData.pedido.total)}</span>
                </div>
              </div>

              {/* Tempo Restante */}
              {timeLeft && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold text-lg w-full text-center shadow-sm">
                  Expira em: {timeLeft}
                </div>
              )}

              {/* QR Code */}
              <div className="bg-white p-4 rounded-3xl border border-border shadow-sm">
                <img 
                  src={`data:image/png;base64,${pixData.image}`} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 object-contain"
                />
              </div>

              {/* Pix Copia e Cola */}
              <div className="w-full space-y-2">
                <p className="text-sm font-medium text-muted-foreground text-left">Pix Copia e Cola:</p>
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

          <div className="flex flex-col gap-2 w-full pt-4 border-t border-border/50">
            <Button 
              size="lg" 
              disabled
              className="w-full rounded-xl bg-green-600/80 hover:bg-green-600/80 text-white relative overflow-hidden disabled:opacity-100"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Aguardando Pagamento...
              </span>
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Esta janela atualizará sozinha quando o pagamento for identificado.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Avaliação de Produto */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" />
              Avaliar Relógio
            </DialogTitle>
            <DialogDescription>
              Compartilhe sua experiência sobre o *{selectedProduct?.nome_produto}*
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Seu Nome (como aparecerá na avaliação)</Label>
              <Input 
                value={reviewTitle} 
                onChange={e => setReviewTitle(e.target.value)} 
                placeholder="Seu nome" 
                required 
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Quantas estrelas este relógio merece?</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewStars(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        star <= reviewStars 
                          ? "text-yellow-500 fill-yellow-500" 
                          : "text-muted hover:text-yellow-500/50"
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sua opinião</Label>
              <Textarea 
                value={reviewMessage} 
                onChange={e => setReviewMessage(e.target.value)} 
                placeholder="Escreva o que você achou do relógio, qualidade, acabamento..." 
                rows={4}
                className="rounded-xl resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Foto do relógio (opcional, deixa a avaliação incrível!)</Label>
              <div className="flex items-center gap-4">
                <Input 
                  id="review-image-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="rounded-xl text-xs max-w-[200px]"
                />
                {reviewImagePreview && (
                  <div className="relative">
                    <img 
                      src={reviewImagePreview} 
                      alt="Preview" 
                      className="h-16 w-16 object-cover rounded-xl border border-border" 
                    />
                    <button 
                      type="button" 
                      onClick={() => { setReviewImage(null); setReviewImagePreview(null); const el = document.getElementById("review-image-upload") as HTMLInputElement; if (el) el.value = ""; }} 
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border/50">
              <Button 
                type="submit" 
                disabled={submittingReview}
                className="flex-1 rounded-xl bg-primary text-primary-foreground font-bold"
              >
                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enviar Avaliação
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSS para Efeito Flip 3D do Cartão e Variáveis de Perspectiva */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>

      {/* Modal Premium de Cartão de Crédito - Pagamento Transparente */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="sm:max-w-md bg-[#0D0D0D] border-zinc-800 text-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 justify-center font-serif-elegant tracking-wide">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Pagamento com Cartão
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-center">
              Preencha os dados do seu cartão com total segurança.
            </DialogDescription>
          </DialogHeader>

          {/* Cartão de Crédito 3D Gráfico Interativo */}
          <div className="flex justify-center my-6 perspective-1000">
            <div className={`relative w-full max-w-[300px] h-[170px] rounded-2xl transition-transform duration-700 transform-style-3d ${isFlipped ? "rotate-y-180" : ""} shadow-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-5 border border-zinc-700/50 flex flex-col justify-between text-white font-mono`}>
              
              {/* Parte da Frente do Cartão */}
              <div className="absolute inset-0 w-full h-full p-5 flex flex-col justify-between backface-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950">
                <div className="flex justify-between items-start">
                  {/* Chip do Cartão em Dourado Luxo */}
                  <div className="w-10 h-7 rounded bg-gradient-to-tr from-amber-400 to-amber-600 border border-amber-300/40 relative overflow-hidden">
                    <div className="absolute inset-x-0 top-1/2 border-t border-amber-700/40" />
                    <div className="absolute inset-y-0 left-1/2 border-l border-amber-700/40" />
                  </div>
                  {/* Bandeira Dinâmica */}
                  <div className="h-6 flex items-center font-bold text-xs uppercase italic tracking-widest text-zinc-500">
                    {(() => {
                      const brand = getCardBrand(cardData.number);
                      if (brand === "visa") return <span className="text-blue-500 font-extrabold">VISA</span>;
                      if (brand === "mastercard") return <span className="text-red-500 font-extrabold">MasterCard</span>;
                      if (brand === "amex") return <span className="text-emerald-500 font-extrabold">AMEX</span>;
                      if (brand === "elo") return <span className="text-yellow-500 font-extrabold">ELO</span>;
                      return <span className="text-zinc-500 text-[10px]">Cartão</span>;
                    })()}
                  </div>
                </div>

                {/* Número do Cartão */}
                <div className="text-lg md:text-xl tracking-[0.1em] text-center my-3 select-none text-zinc-100">
                  {cardData.number || "•••• •••• •••• ••••"}
                </div>

                <div className="flex justify-between items-end">
                  <div className="max-w-[70%]">
                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Titular</p>
                    <p className="text-xs truncate font-bold text-zinc-300 uppercase tracking-wider">{cardData.holder || "NOME DO TITULAR"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Validade</p>
                    <p className="text-xs font-bold text-zinc-300">{cardData.expiry || "••/••"}</p>
                  </div>
                </div>
              </div>

              {/* Parte de Trás do Cartão (CVV) */}
              <div className="absolute inset-0 w-full h-full rounded-2xl backface-hidden rotate-y-180 bg-gradient-to-br from-zinc-950 to-zinc-900 flex flex-col justify-between py-5">
                <div className="w-full h-9 bg-zinc-800" />
                <div className="px-5 space-y-2">
                  <div className="flex justify-between items-center bg-zinc-200 text-zinc-900 rounded p-1.5 font-bold font-mono text-sm">
                    <span className="text-xs text-zinc-400 select-none">Assinatura</span>
                    <span className="bg-white px-2 py-0.5 rounded shadow-sm text-right select-none">{cardData.cvv || "•••"}</span>
                  </div>
                </div>
                <p className="text-[7px] text-center text-zinc-600 px-5 leading-normal select-none">
                  Este cartão é de uso pessoal e intransferível. Eternus Relógios Co. 🕰️
                </p>
              </div>

            </div>
          </div>

          {/* Formulário do Cartão */}
          <div className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="cardNumber">Número do Cartão</Label>
              <Input 
                id="cardNumber"
                placeholder="0000 0000 0000 0000"
                value={cardData.number}
                onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                className="bg-zinc-900 border-zinc-800 rounded-xl text-white font-mono placeholder:text-zinc-600 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="cardExpiry">Validade</Label>
                <Input 
                  id="cardExpiry"
                  placeholder="MM/AA"
                  value={cardData.expiry}
                  onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                  className="bg-zinc-900 border-zinc-800 rounded-xl text-white font-mono placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cardCvv">Cód. Segurança (CVV)</Label>
                <Input 
                  id="cardCvv"
                  placeholder="123"
                  value={cardData.cvv}
                  onFocus={() => setIsFlipped(true)}
                  onBlur={() => setIsFlipped(false)}
                  onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  className="bg-zinc-900 border-zinc-800 rounded-xl text-white font-mono placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="cardHolder">Nome do Titular (Como no Cartão)</Label>
              <Input 
                id="cardHolder"
                placeholder="NOME COMPLETO"
                value={cardData.holder}
                onChange={(e) => setCardData({ ...cardData, holder: e.target.value.toUpperCase() })}
                className="bg-zinc-900 border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="cardCpf">CPF do Titular</Label>
              <Input 
                id="cardCpf"
                placeholder="000.000.000-00"
                value={cardData.cpf}
                onChange={(e) => setCardData({ ...cardData, cpf: formatCPF(e.target.value) })}
                className="bg-zinc-900 border-zinc-800 rounded-xl text-white font-mono placeholder:text-zinc-600 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="cardInstallments">Número de Parcelas</Label>
              <select
                id="cardInstallments"
                value={cardData.installments}
                onChange={(e) => setCardData({ ...cardData, installments: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                {selectedPedidoForCard && Array.from({ length: 12 }).map((_, i) => {
                  const count = i + 1;
                  const value = selectedPedidoForCard.total / count;
                  if (value < 5.0) return null; // asaas requirement: min 5 BRL per installment
                  return (
                    <option key={count} value={count} className="bg-zinc-900">
                      {count}x de {formatCurrency(value)} sem juros
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t border-zinc-900/50 flex flex-col gap-2 w-full sm:flex-col">
            <Button
              onClick={handleCreditCardPayment}
              disabled={isProcessingCard}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-lg rounded-2xl gap-2 transition-all flex items-center justify-center"
            >
              {isProcessingCard ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando Pagamento...
                </>
              ) : (
                <>
                  Finalizar compra
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              disabled={isProcessingCard}
              onClick={() => setShowCardModal(false)}
              className="w-full text-zinc-500 hover:text-white"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento */}
      <Dialog open={!!pedidoToCancel} onOpenChange={(open) => !open && setPedidoToCancel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Cancelar Pedido
            </DialogTitle>
            <DialogDescription>
              Você está prestes a cancelar o pedido #{pedidoToCancel?.id.slice(0, 8).toUpperCase()}.
              Por favor, informe o motivo do cancelamento para nos ajudar a melhorar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>Selecione o motivo:</Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Encontrei um preço menor",
                  "Prazo de entrega muito longo",
                  "Comprei por engano",
                  "Decidi não comprar mais",
                  "Outros"
                ].map(option => (
                  <Button
                    key={option}
                    type="button"
                    variant={selectedReasonOption === option ? "default" : "outline"}
                    onClick={() => setSelectedReasonOption(option)}
                    className={`justify-start text-left h-auto py-2.5 px-4 rounded-xl transition-all ${
                      selectedReasonOption === option 
                        ? "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/20" 
                        : "hover:bg-primary/5 text-muted-foreground border-border/60"
                    }`}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            {selectedReasonOption === "Outros" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label>Poderia nos explicar melhor?</Label>
                <Textarea 
                  value={cancelReason} 
                  onChange={e => setCancelReason(e.target.value)} 
                  placeholder="Descreva o motivo..." 
                  rows={3}
                  className="resize-none rounded-xl"
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setPedidoToCancel(null);
                setSelectedReasonOption("");
                setCancelReason("");
              }}
              className="w-full sm:w-auto rounded-xl"
              disabled={isCancelling}
            >
              Voltar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleCancelOrder}
              disabled={isCancelling || !selectedReasonOption || (selectedReasonOption === "Outros" && !cancelReason.trim())}
              className="w-full sm:w-auto rounded-xl font-bold"
            >
              {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
