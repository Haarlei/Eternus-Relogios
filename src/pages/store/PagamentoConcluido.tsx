import { CheckCircle2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PagamentoConcluido() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [updating, setUpdating] = useState(false);
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    if (orderId) {
      handleSuccess();
    }
  }, [orderId]);

  const handleSuccess = async () => {
    setUpdating(true);
    try {
      // Pequeno delay para garantir que o webhook ou o processamento inicial ocorreu
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { error } = await supabase
        .from("pedidos")
        .update({ 
          status: "Pago",
          atualizado_em: new Date().toISOString() 
        })
        .eq("id", orderId)
        .eq("status", "Aguardando Pagamento"); // Só atualiza se ainda estiver aguardando

      if (error) console.error("Erro ao atualizar status:", error);
      else toast.success("Pagamento confirmado com sucesso!");
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-background border-2 border-primary rounded-full p-1">
          <div className="bg-primary rounded-full p-1">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>

      <h1 className="text-3xl md:text-5xl font-bold font-serif-elegant mb-4 tracking-tight">
        Pedido Confirmado!
      </h1>
      
      <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg leading-relaxed">
        Muito obrigado pela sua preferência. O pagamento foi processado com sucesso e seu pedido já está em nossa fila de preparação.
      </p>

      {orderId && (
        <div className="mb-8 p-4 rounded-2xl bg-muted/50 border border-border inline-block">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Número do Pedido</p>
          <p className="font-mono font-bold text-primary">#{orderId.slice(0, 8).toUpperCase()}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          size="lg"
          onClick={() => navigate("/minha-conta")} 
          className="px-8 rounded-2xl gap-2 font-semibold shadow-lg shadow-primary/20"
        >
          Acompanhar Pedido
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => navigate("/")} 
          className="px-8 rounded-2xl gap-2 font-semibold"
        >
          <ShoppingBag className="w-4 h-4" />
          Voltar para a Loja
        </Button>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        Você receberá uma confirmação no seu e-mail cadastrado em breve.
      </p>
    </div>
  );
}
