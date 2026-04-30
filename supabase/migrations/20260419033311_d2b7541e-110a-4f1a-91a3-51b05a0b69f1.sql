-- Add prazo de pagamento to vendas
ALTER TABLE public.vendas ADD COLUMN data_vencimento_pagamento date;

-- Create devedores_historico table
CREATE TABLE public.devedores_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  devedor_id UUID NOT NULL,
  user_id UUID NOT NULL,
  editor_email TEXT,
  acao TEXT NOT NULL,
  alteracoes JSONB,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.devedores_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu histórico"
ON public.devedores_historico FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar histórico"
ON public.devedores_historico FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_devedores_historico_devedor ON public.devedores_historico(devedor_id, criado_em DESC);