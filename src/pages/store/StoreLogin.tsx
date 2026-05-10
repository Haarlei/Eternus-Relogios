import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, User, Lock, Mail, Watch } from "lucide-react";
import { maskPhone, unmaskValue } from "@/lib/masks";

export default function StoreLogin() {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = (location.state as any)?.redirect || "/minha-conta";

  const [tab, setTab] = useState<"login" | "cadastro">("login");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ nome: "", email: "", telefone: "", password: "", confirmPass: "" });

  useEffect(() => {
    if (!authLoading && user) {
      if (user.is_admin) {
        navigate("/dashboard", { replace: true });
      } else {
        const from = location.state?.redirect || "/minha-conta";
        navigate(from, { replace: true });
      }
    }
  }, [user, authLoading, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginForm.email, loginForm.password);
      toast.success("Bem-vindo de volta!");
      // O useEffect acima cuidará do redirecionamento baseado no status de admin
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPass) {
      return toast.error("As senhas não coincidem.");
    }
    if (signupForm.password.length < 6) {
      return toast.error("A senha deve ter ao menos 6 caracteres.");
    }
    setLoading(true);
    try {
      await signUp(signupForm.email, signupForm.password, signupForm.nome, unmaskValue(signupForm.telefone));
      toast.success("Código de verificação enviado para seu e-mail!");
      navigate("/verificar-email", { state: { email: signupForm.email } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Watch className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-serif-elegant tracking-wide mb-2">
            {tab === "login" ? "Bem-vindo de volta" : "Criar sua Conta"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {tab === "login"
              ? "Acesse sua conta para ver seus pedidos."
              : "Junte-se à experiência Eternus."}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-muted p-1 mb-8">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setTab("cadastro")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === "cadastro" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Criar Conta
          </button>
        </div>

        {/* Login Form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  value={loginForm.email}
                  onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-pass">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-pass"
                  type={showPass ? "text" : "password"}
                  placeholder="Sua senha"
                  className="pl-10 pr-10"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar na Minha Conta"}
            </Button>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === "cadastro" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-nome">Nome Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-nome"
                  placeholder="João Silva"
                  className="pl-10"
                  value={signupForm.nome}
                  onChange={e => setSignupForm({ ...signupForm, nome: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">E-mail *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  value={signupForm.email}
                  onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-phone">WhatsApp *</Label>
              <Input
                id="signup-phone"
                placeholder="(00) 00000-0000"
                value={signupForm.telefone}
                onChange={e => setSignupForm({ ...signupForm, telefone: maskPhone(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-pass">Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-pass"
                  type={showPass ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10 pr-10"
                  value={signupForm.password}
                  onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm">Confirmar Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-confirm"
                  type={showPass ? "text" : "password"}
                  placeholder="Repita a senha"
                  className="pl-10"
                  value={signupForm.confirmPass}
                  onChange={e => setSignupForm({ ...signupForm, confirmPass: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
              {loading ? "Criando conta..." : "Criar Minha Conta"}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Ao criar uma conta, você concorda com nossas{" "}
              <span className="text-primary">Políticas de Privacidade</span>.
            </p>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Voltar para a Loja
          </Link>
        </div>
      </div>
    </div>
  );
}
