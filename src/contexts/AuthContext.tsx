import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SafeUser {
  id: string;
  email: string | undefined;
  nome?: string;
  telefone?: string;
  endereco?: any;
  is_admin?: boolean;
}

interface AuthContextType {
  user: SafeUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string, telefone: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { nome?: string; telefone?: string; endereco?: any }) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (message.includes("Too many requests")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (message.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (message.includes("Password should be at least")) return "A senha deve ter no mínimo 6 caracteres.";
  return `Erro ao autenticar: ${message}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, email: string | undefined) => {
    try {
      const { data, error } = await (supabase
        .from("perfis")
        .select("nome, telefone, endereco, is_admin")
        .eq("id", userId)
        .maybeSingle() as any);
      
      if (!error && data) {
        setUser({ 
          id: userId, 
          email, 
          nome: data.nome, 
          telefone: data.telefone, 
          endereco: data.endereco,
          is_admin: data.is_admin 
        });
      } else {
        // Fallback: If user session is active but profile row is missing (due to RLS block during unconfirmed signup),
        // we can now safely insert it since the user is authenticated.
        let nome = "";
        let telefone = "";
        
        // 1. Try local backup first (extremely reliable, immediate, immune to Auth metadata delays)
        const localDataStr = localStorage.getItem(`pending_profile_${userId}`);
        if (localDataStr) {
          try {
            const localData = JSON.parse(localDataStr);
            nome = localData.nome || "";
            telefone = localData.telefone || "";
          } catch (e) {
            console.error("Error parsing local profile backup:", e);
          }
        }
        
        // 2. Fallback to auth metadata if local backup isn't present
        if (!nome) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            nome = authUser.user_metadata?.nome || authUser.user_metadata?.full_name || "";
            telefone = authUser.user_metadata?.telefone || authUser.user_metadata?.phone || "";
          }
        }
        
        if (nome) {
          const { error: insertError } = await supabase.from("perfis").insert({
            id: userId,
            nome,
            telefone,
            is_admin: false
          } as any);
          
          if (!insertError) {
            // Clean up local storage backup on success
            localStorage.removeItem(`pending_profile_${userId}`);
            
            setUser({
              id: userId,
              email,
              nome,
              telefone,
              is_admin: false
            });
            return;
          } else {
            console.error("Error inserting fallback profile:", insertError);
          }
        }
        
        setUser({ id: userId, email });
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setUser({ id: userId, email });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(mapAuthError(error.message));
  };

  const signUp = async (email: string, password: string, nome: string, telefone: string) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          nome,
          telefone
        }
      }
    });
    if (error) throw new Error(mapAuthError(error.message));
    if (data.user) {
      // Back up locally to ensure we can restore it on loadProfile after verification
      localStorage.setItem(`pending_profile_${data.user.id}`, JSON.stringify({ nome, telefone }));
      
      // Try to insert profile row immediately (will fail if unconfirmed, succeed if auto-confirmed)
      await supabase.from("perfis").insert({
        id: data.user.id,
        nome,
        telefone,
        is_admin: false,
      } as any);
    }
  };

  const updateProfile = async (updates: { nome?: string; telefone?: string; endereco?: any }) => {
    if (!user) return;
    const { error } = await supabase.from("perfis").update(updates).eq("id", user.id);
    if (error) throw error;
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup'
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateProfile, verifyOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
