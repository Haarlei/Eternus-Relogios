import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PagamentoConcluido() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-primary" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold font-serif-elegant mb-4">
        Pagamento Realizado!
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Muito obrigado pela sua compra na Eternus Relógios. O seu pedido foi registrado e será preparado para o envio em breve.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => navigate("/")} className="px-8 rounded-full">
          Voltar para a Loja
        </Button>
      </div>
    </div>
  );
}
