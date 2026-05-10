-- Migration: Create perfis and pedidos tables

-- Create perfis table linked to auth.users
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    endereco JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Secure perfis with RLS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Usuários podem ver seus próprios perfis" 
ON public.perfis FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Usuários podem atualizar seus próprios perfis" 
ON public.perfis FOR UPDATE 
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Usuários podem criar seus próprios perfis" 
ON public.perfis FOR INSERT 
WITH CHECK (auth.uid() = id);


-- Create pedidos table
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Aguardando Pagamento' CHECK (status IN ('Aguardando Pagamento', 'Pago', 'Em Embalagem', 'Enviado aos Correios', 'Entregue', 'Cancelado')),
    metodo_pagamento TEXT NOT NULL CHECK (metodo_pagamento IN ('Online (InfinitePay)', 'WhatsApp')),
    total_amount NUMERIC(10, 2) NOT NULL,
    itens JSONB NOT NULL,
    order_nsu TEXT, -- Unique ID from InfinitePay if applicable
    checkout_url TEXT, -- Link to InfinitePay checkout if applicable
    endereco_entrega JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Secure pedidos with RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own orders
CREATE POLICY "Usuários podem ver seus próprios pedidos" 
ON public.pedidos FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own orders
CREATE POLICY "Usuários podem criar seus próprios pedidos" 
ON public.pedidos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- NOTE: Update and Delete is restricted to Admins (or Webhooks with service role key)
