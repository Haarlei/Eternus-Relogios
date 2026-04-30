CREATE TABLE public.logs_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  editor_email TEXT,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  acao TEXT NOT NULL,
  descricao TEXT,
  detalhes JSONB,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.logs_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus logs"
ON public.logs_atividades FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar logs"
ON public.logs_atividades FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_logs_atividades_user_data ON public.logs_atividades(user_id, criado_em DESC);
CREATE INDEX idx_logs_atividades_entidade ON public.logs_atividades(entidade, entidade_id);