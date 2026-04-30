
-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela: produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_produto TEXT NOT NULL,
  descricao TEXT,
  genero TEXT NOT NULL DEFAULT 'unisex' CHECK (genero IN ('masculino', 'feminino', 'unisex')),
  preco_fornecedor NUMERIC NOT NULL DEFAULT 0,
  margem NUMERIC NOT NULL DEFAULT 0,
  taxa_debito NUMERIC NOT NULL DEFAULT 0,
  taxa_credito NUMERIC NOT NULL DEFAULT 0,
  taxa_credito_2x NUMERIC NOT NULL DEFAULT 0,
  estoque_inicial INTEGER NOT NULL DEFAULT 0,
  estoque_atual INTEGER NOT NULL DEFAULT 0,
  preco_com_margem NUMERIC GENERATED ALWAYS AS (preco_fornecedor * (1 + margem / 100)) STORED,
  preco_debito NUMERIC GENERATED ALWAYS AS (preco_fornecedor * (1 + margem / 100) * (1 + taxa_debito / 100)) STORED,
  preco_credito NUMERIC GENERATED ALWAYS AS (preco_fornecedor * (1 + margem / 100) * (1 + taxa_credito / 100)) STORED,
  preco_credito_2x NUMERIC GENERATED ALWAYS AS (preco_fornecedor * (1 + margem / 100) * (1 + taxa_credito_2x / 100)) STORED,
  imagem_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus produtos" ON public.produtos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar produtos" ON public.produtos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus produtos" ON public.produtos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus produtos" ON public.produtos FOR DELETE USING (auth.uid() = user_id);

-- Tabela: vendas
CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC NOT NULL,
  metodo_pagamento TEXT NOT NULL CHECK (metodo_pagamento IN ('debito', 'credito', 'parcelado', 'dinheiro', 'pix')),
  tipo_cartao TEXT,
  valor_bruto NUMERIC NOT NULL,
  valor_liquido NUMERIC NOT NULL,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  possui_juros BOOLEAN NOT NULL DEFAULT false,
  taxa_juros_mensal NUMERIC DEFAULT 0,
  valor_total_com_juros NUMERIC,
  status_pagamento TEXT NOT NULL DEFAULT 'pago' CHECK (status_pagamento IN ('pago', 'pendente', 'atrasado')),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas vendas" ON public.vendas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar vendas" ON public.vendas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas vendas" ON public.vendas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar suas vendas" ON public.vendas FOR DELETE USING (auth.uid() = user_id);

-- Tabela: parcelas
CREATE TABLE public.parcelas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  juros_aplicado NUMERIC DEFAULT 0,
  multa_aplicada NUMERIC DEFAULT 0
);

ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas parcelas" ON public.parcelas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar parcelas" ON public.parcelas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas parcelas" ON public.parcelas FOR UPDATE USING (auth.uid() = user_id);

-- Tabela: devedores
CREATE TABLE public.devedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  valor_total_devido NUMERIC NOT NULL,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  saldo_devedor NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_dia' CHECK (status IN ('em_dia', 'atrasado', 'quitado')),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.devedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus devedores" ON public.devedores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar devedores" ON public.devedores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus devedores" ON public.devedores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus devedores" ON public.devedores FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('produtos', 'produtos', true);

CREATE POLICY "Imagens de produtos são públicas" ON storage.objects FOR SELECT USING (bucket_id = 'produtos');
CREATE POLICY "Usuários podem fazer upload de imagens" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'produtos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Usuários podem atualizar imagens" ON storage.objects FOR UPDATE USING (bucket_id = 'produtos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Usuários podem deletar imagens" ON storage.objects FOR DELETE USING (bucket_id = 'produtos' AND auth.uid() IS NOT NULL);
