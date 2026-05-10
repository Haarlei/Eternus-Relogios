import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Watch, ArrowLeft, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function VerifyEmail() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60); // 60 segundos de espera
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    if (!canResend) return;

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      toast.error("Aguarde um pouco para reenviar.");
    } else {
      toast.success("Um novo código foi enviado!");
      setTimer(60);
      setCanResend(false);
    }
    setLoading(false);
  };

  if (!email) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">E-mail não encontrado. Por favor, tente se cadastrar novamente.</p>
        <Button onClick={() => navigate("/entrar")}>Voltar</Button>
      </div>
    );
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return toast.error("O código deve ter pelo menos 6 dígitos.");

    setLoading(true);
    try {
      await verifyOtp(email, code);
      toast.success("E-mail verificado com sucesso!");
      navigate("/minha-conta");
    } catch (err: any) {
      toast.error(err.message || "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Watch className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-serif-elegant tracking-wide mb-2">
            Verifique seu E-mail
          </h1>
          <p className="text-muted-foreground text-sm">
            Enviamos um código para <span className="font-semibold text-foreground">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code">Código de Verificação</Label>
            <Input
              id="code"
              placeholder="000000"
              className="text-center text-2xl tracking-[0.2em] font-bold h-14"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              required
            />
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
            {loading ? "Verificando..." : "Confirmar Código"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || loading}
              className={`inline-flex items-center gap-2 text-sm font-medium transition-all ${canResend
                  ? "text-primary hover:underline"
                  : "text-muted-foreground cursor-not-allowed"
                }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${timer > 0 ? "animate-spin-slow" : ""}`} />
              {canResend ? "Reenviar código" : `Reenviar em ${timer}s`}
            </button>
          </div>
        </form>

        <div className="mt-10 text-center">
          <button
            onClick={() => navigate("/entrar")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Login
          </button>
        </div>
      </div>
    </div>
  );
}
