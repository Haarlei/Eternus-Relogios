-- Adiciona a coluna produto_id na tabela avaliacoes referenciando a tabela produtos
ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE;
