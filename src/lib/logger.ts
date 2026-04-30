import { supabase } from "@/integrations/supabase/client";

export type Entidade = "produto" | "venda" | "parcela" | "devedor";
export type Acao = "criacao" | "edicao" | "exclusao" | "pagamento";

interface LogParams {
  userId: string;
  email?: string | null;
  entidade: Entidade;
  entidadeId?: string | null;
  acao: Acao;
  descricao: string;
  detalhes?: Record<string, any>;
}

export async function logAtividade({
  userId,
  email,
  entidade,
  entidadeId,
  acao,
  descricao,
  detalhes,
}: LogParams) {
  try {
    await supabase.from("logs_atividades").insert({
      user_id: userId,
      editor_email: email || null,
      entidade,
      entidade_id: entidadeId || null,
      acao,
      descricao,
      detalhes: detalhes || null,
    });
  } catch (err) {
    console.error("Falha ao registrar log:", err);
  }
}
