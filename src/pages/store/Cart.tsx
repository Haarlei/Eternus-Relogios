import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import {
  Trash2, Minus, Plus, ShoppingBag, CreditCard, ArrowLeft, ArrowRight,
  MessageCircle, LogIn, MapPin, Search, Loader2,
  QrCode, Copy, Check, Eye, EyeOff, User, Mail, Phone, Lock, Watch
} from "lucide-react";
import { maskPhone, unmaskValue } from "@/lib/masks";
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
  const { items, updateQuantity, removeItem, totalPrice, subtotal, desconto, cupomAplicado, applyCupom, removeCupom, clearCart } = useCart();
  const { user, updateProfile, signIn, signUp, verifyOtp } = useAuth();
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
  const [pixData, setPixData] = useState<{ code: string; image: string; orderId: string; criado_em?: string } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsApplyingCoupon(true);
    const success = await applyCupom(couponCode);
    if (success) setCouponCode("");
    setIsApplyingCoupon(false);
  };
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // --- Inline Checkout Auth States & Functions ---
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "cadastro">("cadastro");
  const [authStep, setAuthStep] = useState<"form" | "otp">("form");
  const [pendingAction, setPendingAction] = useState<"WHATSAPP" | "PIX" | "CREDIT_CARD" | "PROCEED_TO_PAYMENT" | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"CART" | "ADDRESS" | "PAYMENT" | "SUCCESS_WHATSAPP">("CART");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [signupNome, setSignupNome] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupTelefone, setSignupTelefone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [otpCode, setOtpCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Trigger actions depending on user authentication status
  const triggerWhatsAppCheckout = () => {
    if (!user) {
      setPendingAction("WHATSAPP");
      setAuthTab("cadastro");
      setAuthStep("form");
      setShowAuthDialog(true);
    } else {
      handleFinalizeCheckout();
    }
  };

  const triggerAsaasCheckout = (billingType: "PIX" | "CREDIT_CARD") => {
    if (!user) {
      setPendingAction(billingType === "PIX" ? "PIX" : "CREDIT_CARD");
      setAuthTab("cadastro");
      setAuthStep("form");
      setShowAuthDialog(true);
    } else {
      if (billingType === "PIX") {
        handleAsaasCheckout("PIX");
      } else {
        openCreditCardModal();
      }
    }
  };

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    setAuthLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast.success("Bem-vindo de volta!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInlineSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupNome || !signupEmail || !signupTelefone || !signupPassword) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    if (signupPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setAuthLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupNome, unmaskValue(signupTelefone));
      toast.success("Código de verificação enviado para seu e-mail!");
      setAuthStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar cadastro.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInlineVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      toast.error("Insira o código de verificação.");
      return;
    }
    setAuthLoading(true);
    try {
      await verifyOtp(signupEmail, otpCode);
      toast.success("E-mail verificado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Código inválido ou expirado.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Transparent Credit Card States
  const [showCardModal, setShowCardModal] = useState(false);
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
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

  const openCreditCardModal = () => {
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

    setCardData({
      number: "",
      holder: user.nome || "",
      expiry: "",
      cvv: "",
      cpf: formatCPF(address.cpf),
      installments: "1"
    });
    setShowCardModal(true);
  };

  const handleCreditCardPayment = async () => {
    if (!cardData.number || !cardData.holder || !cardData.expiry || !cardData.cvv || !cardData.cpf) {
      toast.error("Por favor, preencha todos os campos do cartão.");
      return;
    }

    setIsProcessingCard(true);
    try {
      const itens = items.map(item => ({
        nome_produto: item.nome_produto,
        quantidade: item.quantidade,
        preco: item.preco,
        produto_id: item.id,
      }));

      const enderecoEntrega = {
        cliente: {
          nome: user!.nome,
          email: user!.email,
          telefone: user!.telefone,
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
        },
        billing_type: "CREDIT_CARD"
      };

      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          user_id: user!.id,
          status: "Aguardando Pagamento",
          metodo_pagamento: "Online (Asaas)",
          total: totalPrice,
          itens,
          endereco_entrega: enderecoEntrega,
        })
        .select("id, criado_em")
        .single();

      if (pedidoError) throw new Error(pedidoError.message);

      const [expiryMonth, expiryYear] = cardData.expiry.split("/");
      if (!expiryMonth || !expiryYear || expiryMonth.length !== 2 || expiryYear.length !== 2) {
        throw new Error("Validade do cartão inválida. Use o formato MM/AA.");
      }

      const redirectUrl = `${window.location.origin}/pagamento-concluido?order_id=${pedido.id}`;
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke("create_asaas_payment", {
        body: {
          amount: totalPrice,
          orderId: pedido.id,
          redirectUrl,
          billingType: "CREDIT_CARD",
          customer: {
            id: user!.id,
            name: user!.nome || signupNome || "Cliente Eternus",
            email: user!.email,
            phone: user!.telefone,
            cpf: address.cpf,
            address,
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
            postalCode: address.cep.replace(/\D/g, ""),
            addressNumber: address.numero,
            phone: user!.telefone.replace(/\D/g, ""),
            installmentCount: Number(cardData.installments),
          }
        },
      });

      if (paymentError) throw new Error(await getFunctionErrorMessage(paymentError));
      if (paymentData?.error) throw new Error(paymentData.error);

      await supabase
        .from("pedidos")
        .update({
          checkout_url: paymentData.invoiceUrl,
          order_nsu: paymentData.paymentId,
          status: "Pago",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", pedido.id);

      clearCart();
      toast.success("Pagamento aprovado com sucesso!");
      setShowCardModal(false);
      navigate(`/pagamento-concluido?order_id=${pedido.id}`);
    } catch (err: any) {
      toast.error(err.message || "Falha ao processar pagamento com cartão.");
    } finally {
      setIsProcessingCard(false);
    }
  };

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

  // Real-time listener for PIX payment confirmation
  useEffect(() => {
    if (!pixData?.orderId) return;

    const channel = supabase
      .channel(`payment_status_${pixData.orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos",
          filter: `id=eq.${pixData.orderId}`,
        },
        (payload) => {
          if (payload.new.status === "Pago") {
            toast.success("Pagamento confirmado!");
            setPixData(null);
            navigate(`/pagamento-concluido?order_id=${pixData.orderId}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pixData?.orderId, navigate]);

  // Timer for expiration (10 minutes from creation)
  useEffect(() => {
    if (!pixData?.criado_em) return;

    const creationTime = new Date(pixData.criado_em).getTime();
    const expirationTime = creationTime + 10 * 60 * 1000; // 10 minutes

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expirationTime - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft("Expirado");

        // Delete the order if time expires
        supabase.from("pedidos").delete().eq("id", pixData.orderId).then(() => {
          toast.error("O tempo limite para pagamento PIX esgotou. Seu pedido foi excluído.");
          setPixData(null);
        });

        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [pixData?.criado_em]);

  // Execute pending checkout action automatically after user successfully signs in/up
  useEffect(() => {
    if (user && pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      setShowAuthDialog(false);

      toast.success("Identificação concluída com sucesso!");

      // Give a tiny timeout for state updates and context loading to settle
      setTimeout(() => {
        if (action === "WHATSAPP") {
          handleFinalizeCheckout();
        } else if (action === "PIX") {
          handleAsaasCheckout("PIX");
        } else if (action === "CREDIT_CARD") {
          openCreditCardModal();
        } else if (action === "PROCEED_TO_PAYMENT") {
          setCheckoutStep("PAYMENT");
        }
      }, 300);
    }
  }, [user, pendingAction]);

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
      setCheckoutStep("SUCCESS_WHATSAPP");
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
        },
        billing_type: billingType
      };

      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          user_id: user.id,
          status: "Aguardando Pagamento",
          metodo_pagamento: "Online (Asaas)",
          total: totalPrice,
          itens,
          endereco_entrega: enderecoEntrega,
        })
        .select("id, criado_em")
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
            name: user.nome || signupNome || "Cliente Eternus",
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
          orderId: pedido.id,
          criado_em: pedido.criado_em
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

  if (items.length === 0 && !pixData) {
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
    <div className="container mx-auto px-4 pt-28 pb-12 lg:pt-36 lg:pb-16 max-w-6xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight font-serif-elegant">Checkout</h1>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center mb-10 gap-0">
        {/* Step 1: Resumo */}
        <button
          onClick={() => setCheckoutStep("CART")}
          className="flex flex-col items-center gap-2 group"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 ${checkoutStep === "CART"
            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
            : "bg-card border-primary text-primary"
            }`}>1</div>
          <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${checkoutStep === "CART" ? "text-primary" : "text-muted-foreground"
            }`}>Resumo</span>
        </button>

        {/* Connector */}
        <div className={`h-0.5 w-16 md:w-24 mb-4 mx-1 transition-all ${checkoutStep === "ADDRESS" || checkoutStep === "PAYMENT" ? "bg-primary" : "bg-border"
          }`} />

        {/* Step 2: Entrega */}
        <button
          onClick={() => (checkoutStep === "PAYMENT") && setCheckoutStep("ADDRESS")}
          className="flex flex-col items-center gap-2 group"
          disabled={checkoutStep === "CART"}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 ${checkoutStep === "ADDRESS"
            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
            : checkoutStep === "PAYMENT"
              ? "bg-card border-primary text-primary cursor-pointer hover:bg-primary/5"
              : "bg-muted border-border text-muted-foreground"
            }`}>2</div>
          <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${checkoutStep === "ADDRESS" ? "text-primary" : "text-muted-foreground"
            }`}>Entrega</span>
        </button>

        {/* Connector */}
        <div className={`h-0.5 w-16 md:w-24 mb-4 mx-1 transition-all ${checkoutStep === "PAYMENT" ? "bg-primary" : "bg-border"
          }`} />

        {/* Step 3: Pagamento */}
        <button
          className="flex flex-col items-center gap-2"
          disabled
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 ${checkoutStep === "PAYMENT"
            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
            : "bg-muted border-border text-muted-foreground"
            }`}>3</div>
          <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${checkoutStep === "PAYMENT" ? "text-primary" : "text-muted-foreground"
            }`}>Pagamento</span>
        </button>
      </div>

      <div className={checkoutStep === "CART" ? "w-full" : "max-w-2xl mx-auto w-full"}>
        {checkoutStep === "ADDRESS" && (
          <div className="w-full space-y-6">
            <div className="p-6 md:p-8 rounded-3xl border border-border bg-card shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Dados de Entrega
                </div>
                <button
                  onClick={() => setCheckoutStep("CART")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-normal"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar ao resumo
                </button>
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
            <Button
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg mt-6 shadow-lg shadow-primary/20 transition-all"
              onClick={() => {
                if (!user) {
                  setPendingAction("PROCEED_TO_PAYMENT");
                  setShowAuthDialog(true);
                } else {
                  setCheckoutStep("PAYMENT");
                }
              }}
            >
              Continuar
            </Button>
          </div>
        )}

        {checkoutStep === "CART" && (
          <div className="w-full">
            {/* Card principal */}
            <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">

              {/* Header da tabela */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_44px] gap-4 px-8 py-4 bg-muted/40 border-b border-border">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Produto</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Quantidade</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Total</span>
                <span />
              </div>

              {/* Linhas de produtos */}
              <div className="divide-y divide-border/60">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_44px] gap-4 items-center px-6 md:px-8 py-6 group hover:bg-muted/20 transition-colors">

                    {/* Produto: imagem + info */}
                    <div className="flex gap-5 items-center">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-muted rounded-2xl overflow-hidden flex-shrink-0 border border-border/50 shadow-sm">
                        {item.imagem_url ? (
                          <img src={item.imagem_url} alt={item.nome_produto} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingBag className="w-8 h-8 opacity-30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base leading-snug line-clamp-2 mb-1">{item.nome_produto}</p>
                        <p className="text-sm text-primary font-bold">{formatCurrency(item.preco)}<span className="text-muted-foreground font-normal"> / un.</span></p>
                      </div>
                    </div>

                    {/* Quantidade */}
                    <div className="flex md:justify-center">
                      <div className="flex items-center gap-1 border border-border rounded-xl overflow-hidden bg-background shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-9 h-9 flex items-center justify-center font-bold text-sm border-x border-border">
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Total item */}
                    <div className="flex md:justify-end">
                      <span className="font-bold text-base">{formatCurrency(item.preco * item.quantidade)}</span>
                    </div>

                    {/* Remover */}
                    <div className="flex md:justify-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-60 group-hover:opacity-100"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer totais + botão */}
              <div className="px-6 md:px-8 py-6 bg-muted/30 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="w-full md:w-auto flex flex-col md:flex-row gap-6">
                  {/* Cupom */}
                  <div className="flex-1 md:min-w-[300px]">
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="coupon" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Cupom de Desconto</Label>
                      {cupomAplicado ? (
                        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
                          <div>
                            <p className="text-sm font-bold text-primary">{cupomAplicado.codigo}</p>
                            <p className="text-xs text-muted-foreground">
                              {cupomAplicado.tipo === 'percentual' ? `${cupomAplicado.valor}% de desconto` : `${formatCurrency(cupomAplicado.valor)} de desconto`}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={removeCupom} className="h-8 text-destructive hover:bg-destructive/10">
                            Remover
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            id="coupon"
                            placeholder="Ex: VERAO20"
                            className="rounded-xl uppercase"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          />
                          <Button
                            variant="secondary"
                            className="rounded-xl"
                            onClick={handleApplyCoupon}
                            disabled={!couponCode || isApplyingCoupon}
                          >
                            {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Totais */}
                  <div className="space-y-1 min-w-[200px]">
                    <div className="flex items-center justify-between gap-8 text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
                    </div>
                    {cupomAplicado && (
                      <div className="flex items-center justify-between gap-8 text-sm text-primary">
                        <span>Desconto ({cupomAplicado.codigo})</span>
                        <span className="font-semibold">- {formatCurrency(desconto)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-8 text-sm text-muted-foreground">
                      <span>Frete</span>
                      <span className="font-semibold text-green-600">A calcular</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/60 mt-2">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-2xl font-black text-primary">{formatCurrency(totalPrice)}</span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
                  <Button
                    variant="outline"
                    className="h-12 px-6 rounded-2xl font-medium border-border text-muted-foreground hover:text-destructive hover:border-destructive/40"
                    onClick={clearCart}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar sacola
                  </Button>
                  <Button
                    size="lg"
                    className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    onClick={() => setCheckoutStep("ADDRESS")}
                  >
                    Finalizar Compra
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}


        {checkoutStep === "PAYMENT" && (
          <div className="w-full space-y-6">
            <div className="p-6 md:p-8 rounded-3xl border border-border bg-card shadow-sm text-left">
              <h2 className="text-xl font-bold mb-6 flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  Confirme seus Dados
                </div>
                <button
                  onClick={() => setCheckoutStep("ADDRESS")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-normal"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar à entrega
                </button>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seus Dados</h3>
                  <div className="bg-muted/30 p-4 rounded-2xl space-y-2">
                    <p className="text-sm font-medium">{user?.nome || signupNome}</p>
                    <p className="text-sm text-muted-foreground">{user?.email || signupEmail}</p>
                    <p className="text-sm text-muted-foreground">{user?.telefone || signupTelefone}</p>
                    <p className="text-sm text-muted-foreground">CPF: {address.cpf}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Endereço de Entrega</h3>
                  <div className="bg-muted/30 p-4 rounded-2xl space-y-2">
                    <p className="text-sm font-medium">{address.rua}, {address.numero}</p>
                    {address.complemento && <p className="text-sm text-muted-foreground">{address.complemento}</p>}
                    <p className="text-sm text-muted-foreground">{address.bairro}</p>
                    <p className="text-sm text-muted-foreground">{address.cidade} - {address.estado}</p>
                    <p className="text-sm text-muted-foreground">CEP: {address.cep}</p>
                  </div>
                </div>
              </div>

              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Resumo do Pedido</h3>
              <div className="space-y-4 mb-6 bg-muted/30 p-4 rounded-2xl">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.imagem_url || ""} alt={item.nome_produto} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">{item.nome_produto}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantidade}</p>
                    </div>
                    <p className="font-bold text-sm">{formatCurrency(item.preco * item.quantidade)}</p>
                  </div>
                ))}
                <div className="pt-4 border-t border-border/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(subtotal)}</span>
                  </div>
                  {cupomAplicado && (
                    <div className="flex justify-between items-center text-primary">
                      <span className="text-sm font-medium">Desconto ({cupomAplicado.codigo})</span>
                      <span className="text-sm font-medium">- {formatCurrency(desconto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border/30">
                    <span className="text-sm font-bold text-muted-foreground">Total a Pagar</span>
                    <span className="text-xl text-primary font-black">{formatCurrency(totalPrice)}</span>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold mb-4 text-center mt-10">Escolha a forma de pagamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  size="lg"
                  className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg shadow-green-500/20 transition-all hover:-translate-y-1 active:scale-[0.98]"
                  onClick={triggerWhatsAppCheckout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="w-6 h-6 mr-2" />
                      Finalizar via whatsapp
                    </>
                  )}
                </Button>

                <Button
                  size="lg"
                  className="w-full h-14 rounded-2xl bg-[#00B4D8] hover:bg-[#0096C7] text-white font-bold text-lg shadow-lg shadow-[#00B4D8]/20 transition-all hover:-translate-y-1 active:scale-[0.98]"
                  onClick={() => triggerAsaasCheckout("PIX")}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <QrCode className="w-6 h-6 mr-2" />
                      Pagar com PIX
                    </>
                  )}
                </Button>
              </div>

              {/* <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full max-w-sm h-14 rounded-2xl border-border text-foreground hover:bg-muted/50 font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                  onClick={openCreditCardModal}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pagar com Cartão
                    </>
                  )}
                </Button>
              </div> */}
            </div>
          </div>
        )}

        {checkoutStep === "SUCCESS_WHATSAPP" && (
          <div className="w-full max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-700 fade-in">
            <div className="p-10 md:p-14 rounded-3xl border border-primary/20 bg-card/60 backdrop-blur-xl shadow-2xl text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-8 border border-green-500/20">
                <Check className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-serif-elegant font-bold text-foreground mb-4">
                Pedido Realizado!
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-md">
                Recebemos seu pedido com sucesso. Redirecionamos você para o nosso WhatsApp para finalizar o atendimento. Nossa equipe retornará em instantes para confirmar os detalhes de pagamento e envio.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <Button
                  onClick={() => navigate("/perfil")}
                  className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-bold"
                >
                  Acompanhar Pedido
                </Button>
                <Button
                  onClick={() => navigate("/colecao")}
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl font-bold"
                >
                  Voltar à Loja
                </Button>
              </div>
            </div>
          </div>
        )}
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
              {timeLeft && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold text-lg">
                  Expira em: {timeLeft}
                </div>
              )}
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
          <Button
            variant="ghost"
            className="w-full mt-2 text-muted-foreground"
            onClick={() => setPixData(null)}
          >
            Fechar e pagar depois
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center w-full">
            Esta janela será fechada automaticamente assim que o pagamento for identificado.
          </p>
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
                {Array.from({ length: 12 }).map((_, i) => {
                  const count = i + 1;
                  const value = totalPrice / count;
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

      {/* Modal Premium de Identificação / Cadastro Rápido */}
      <Dialog open={showAuthDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAuthDialog(false);
          setPendingAction(null);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-[#0D0D0D] border-zinc-800 text-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl p-6">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20">
                <Watch className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold font-serif-elegant tracking-wide text-center">
              {authStep === "otp" ? "Verificação de E-mail" : "Identificação Rápida"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-center text-xs">
              {authStep === "otp"
                ? `Digite o código enviado para ${signupEmail} para confirmar seu pedido.`
                : "Identifique-se ou crie uma conta em segundos para concluir seu pedido de forma direta."}
            </DialogDescription>
          </DialogHeader>

          {authStep === "form" && (
            <>
              {/* Tabs */}
              <div className="flex rounded-2xl bg-zinc-900 p-1 my-4 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAuthTab("cadastro")}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${authTab === "cadastro" ? "bg-primary text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  Cadastro Rápido
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab("login")}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${authTab === "login" ? "bg-primary text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  Já tenho conta
                </button>
              </div>

              {/* Formulários */}
              {authTab === "login" ? (
                <form onSubmit={handleInlineLogin} className="space-y-4 pt-2">
                  <div className="space-y-1 text-left">
                    <Label htmlFor="inline-login-email" className="text-xs text-zinc-400">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <Input
                        id="inline-login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 pl-10 rounded-xl text-white placeholder:text-zinc-600 focus-visible:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-left">
                    <Label htmlFor="inline-login-pass" className="text-xs text-zinc-400">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <Input
                        id="inline-login-pass"
                        type={showPass ? "text" : "password"}
                        placeholder="Sua senha"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 pl-10 pr-10 rounded-xl text-white placeholder:text-zinc-600 focus-visible:ring-primary"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={authLoading}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wider text-xs rounded-xl mt-6 active:scale-95 transition-all flex items-center justify-center"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar e Concluir Pedido"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleInlineSignUp} className="space-y-4 pt-2">
                  <div className="space-y-1 text-left">
                    <Label htmlFor="inline-signup-nome" className="text-xs text-zinc-400">Nome Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <Input
                        id="inline-signup-nome"
                        placeholder="Nome completo"
                        value={signupNome}
                        onChange={(e) => setSignupNome(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 pl-10 rounded-xl text-white placeholder:text-zinc-600 focus-visible:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-left">
                    <Label htmlFor="inline-signup-email" className="text-xs text-zinc-400">E-mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <Input
                        id="inline-signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 pl-10 rounded-xl text-white placeholder:text-zinc-600 focus-visible:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-left">
                    <Label htmlFor="inline-signup-phone" className="text-xs text-zinc-400">WhatsApp / Telefone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <Input
                        id="inline-signup-phone"
                        placeholder="(00) 00000-0000"
                        value={signupTelefone}
                        onChange={(e) => setSignupTelefone(maskPhone(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 pl-10 rounded-xl text-white placeholder:text-zinc-600 focus-visible:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-left">
                    <Label htmlFor="inline-signup-pass" className="text-xs text-zinc-400">Criar Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <Input
                        id="inline-signup-pass"
                        type={showPass ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 pl-10 pr-10 rounded-xl text-white placeholder:text-zinc-600 focus-visible:ring-primary"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={authLoading}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wider text-xs rounded-xl mt-6 active:scale-95 transition-all flex items-center justify-center"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar Cadastro e Continuar"}
                  </Button>
                </form>
              )}
            </>
          )}

          {authStep === "otp" && (
            <form onSubmit={handleInlineVerifyOtp} className="space-y-4 pt-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="inline-otp-code" className="text-xs text-zinc-400">Código de Verificação (6 ou 8 dígitos)</Label>
                <Input
                  id="inline-otp-code"
                  type="text"
                  maxLength={8}
                  placeholder="00000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="bg-zinc-900 border-zinc-800 text-center tracking-[0.5em] text-lg font-mono rounded-xl text-white placeholder:text-zinc-600 focus-visible:ring-primary"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={authLoading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs rounded-xl mt-6 active:scale-95 transition-all flex items-center justify-center"
              >
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar e Finalizar Compra"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
