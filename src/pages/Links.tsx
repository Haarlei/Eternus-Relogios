import { MessageCircle, Instagram, Watch, MapPin, Star, Flame, Copy, Check } from "lucide-react";
import logo from "../image/eternus.png"; // ajuste o caminho conforme sua estrutura
import { useState, useEffect, useRef } from "react";

const WHATSAPP = "5585987939498";
const INSTAGRAM = "eternusrelogios";

const whatsappMessage = `Olá! Vim pelo link da bio 👋

Vi que tem desconto para novos clientes.

Quais relógios você tem disponível hoje? Pode me enviar fotos, valores e opções de parcelamento?`;

const links = [
  {
    label: "🔥 Ver relógios disponíveis",
    sub: "Receba fotos, valores e condições",
    icon: Flame,
    href: `https://eternusrelogios.shop`,
    highlight: true,
  },
  // {
  //   label: "💬 Falar no WhatsApp",
  //   sub: "Atendimento rápido",
  //   icon: MessageCircle,
  //   href: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`,
  // },
  {
    label: "📸 Nosso Instagram",
    sub: `@${INSTAGRAM}`,
    icon: Instagram,
    href: `https://instagram.com/${INSTAGRAM}`,
  },

  {
    label: "⭐ Avaliações de clientes",
    sub: "Veja quem já comprou",
    icon: Star,
    href: `https://www.instagram.com/stories/highlights/18362155528201111/`,
  },

];

const ParticlesBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray: Particle[] = [];

    // Mouse tracking
    const mouse = {
      x: undefined as number | undefined,
      y: undefined as number | undefined,
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.x;
      mouse.y = event.y;
      for (let i = 0; i < 3; i++) {
        particlesArray.push(new Particle());
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      mouse.x = event.touches[0].clientX;
      mouse.y = event.touches[0].clientY;
      for (let i = 0; i < 3; i++) {
        particlesArray.push(new Particle());
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    const colors = ['#5e5e5eff', '#1643a3ff', '#020f07ff', '#dad7d2ff', '#ffffff'];

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = mouse.x || window.innerWidth / 2;
        this.y = mouse.y || window.innerHeight / 2;
        this.size = Math.random() * 5 + 2;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.size > 0.2) this.size -= 0.1;
      }
      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
        if (particlesArray[i].size <= 0.2) {
          particlesArray.splice(i, 1);
          i--;
        }
      }
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
    />
  );
};

export default function Links() {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-10 relative overflow-hidden">
      <ParticlesBackground />

      <div className="w-full max-w-md flex flex-col items-center relative z-10">

        {/* Logo */}
        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl mb-5 border border-border">
          <img
            src={logo}
            alt="Logo Eternus Relógios"
            className="w-full h-full object-contain p-2 bg-black"
          />
        </div>

        {/* Headline (mais forte) */}
        <h1 className="text-2xl font-bold text-foreground tracking-tight drop-shadow-sm">
          Eternus Relógios ⌚
        </h1>

        <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
          Relógios originais direto no seu pulso.
          Entrega rápida 🚚 + parcelamento facilitado.
        </p>

        {/* Prova social */}
        <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
          <span className="text-xs px-3 py-1 rounded-full bg-muted/80 backdrop-blur-sm font-medium border border-border/50">
            +50 clientes atendidos
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-muted/80 backdrop-blur-sm font-medium border border-border/50">
            Enviamos para todo Brasil 🇧🇷
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-muted/80 backdrop-blur-sm font-medium border border-border/50">
            Garantia de 1 ano
          </span>
        </div>

        {/* CTA Principal */}
        <a
          href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full mt-6 rounded-2xl px-5 py-4 bg-green-500 text-white font-semibold text-center shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)] hover:scale-[1.02] transition-all relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Falar no WhatsApp agora
          </span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        </a>

        {/* Links Secundários */}
        <div className="w-full flex flex-col gap-3 mt-6">
          {links.map(({ label, sub, icon: Icon, href, highlight }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                highlight
                  ? "flex items-center gap-4 w-full rounded-2xl px-5 py-4 bg-primary text-primary-foreground shadow-md hover:shadow-xl hover:-translate-y-1 transition-all group"
                  : "flex items-center gap-4 w-full rounded-2xl px-5 py-4 bg-card/80 backdrop-blur-sm border border-border hover:border-primary hover:shadow-md hover:-translate-y-1 transition-all group"
              }
            >
              <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 text-left">
                <p className="font-semibold text-base">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 text-black">{sub}</p>
              </div>

              <span className="text-lg opacity-60 group-hover:translate-x-1 transition-transform">›</span>
            </a>
          ))}
        </div>

        {/* Oferta com urgência (Surpresa) */}
        <div className="mt-8 w-full">
          {!revealed ? (
            <div
              onClick={() => setRevealed(true)}
              className="w-full rounded-2xl border-2 border-dashed border-primary/50 p-4 text-center cursor-pointer bg-card/50 overflow-hidden relative group hover:border-primary transition-all shadow-sm hover:shadow-md"
            >
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[6px] flex items-center justify-center z-10 transition-all group-hover:bg-background/40">
                <div className="flex flex-col items-center gap-2">
                  <span className="font-bold text-sm bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-lg group-hover:scale-105 transition-transform flex items-center gap-2">
                    🎁 Revelar Surpresa
                  </span>
                  <span className="text-[10px] text-foreground/70 font-medium tracking-wide uppercase">Toque para abrir</span>
                </div>
              </div>
              <div className="blur-[4px] opacity-40 select-none pointer-events-none">
                <p className="text-sm font-semibold">
                  🎁 10% OFF no primeiro pedido
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use o cupom <span className="font-bold">BIO10</span> no WhatsApp
                </p>
                <div className="mt-3 flex gap-2 justify-center">
                  <div className="w-20 h-8 bg-muted rounded"></div>
                  <div className="w-8 h-8 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-2xl border-2 border-primary p-4 text-center bg-card shadow-lg transition-all animate-in zoom-in-95 fade-in duration-300 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>

              <div className="relative z-10">
                <p className="text-sm font-bold text-primary flex items-center justify-center gap-2">
                  🎉 Parabéns! Você ganhou 10% OFF
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Copie o cupom abaixo e envie no nosso WhatsApp (válido hoje):
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="bg-muted/50 px-5 py-2.5 rounded-xl font-mono font-bold tracking-widest border border-border/50 text-foreground flex-1 max-w-[150px]">
                    BIO10
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("BIO10");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={`p-2.5 rounded-xl transition-all flex items-center justify-center flex-shrink-0 w-11 h-11 ${copied
                      ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-md"
                      }`}
                    title="Copiar cupom"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copied && (
                  <p className="text-[10px] text-green-500 font-medium mt-2 animate-in slide-in-from-bottom-2 fade-in">
                    Cupom copiado com sucesso!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Local */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-8 relative z-10 bg-background/50 px-3 py-1 rounded-full backdrop-blur-sm">
          <MapPin className="w-3 h-3" />
          <span>Atendemos todo o Brasil</span>
        </div>

        <p className="text-xs text-muted-foreground/70 mt-2 relative z-10 bg-background/50 px-3 py-1 rounded-full backdrop-blur-sm mb-4">
          © {new Date().getFullYear()} Eternus Relógios
        </p>
      </div>
    </div>
  );
}