ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_metodo_pagamento_check;
ALTER TABLE public.vendas ADD CONSTRAINT vendas_metodo_pagamento_check 
  CHECK (metodo_pagamento IN ('dinheiro','pix','debito','credito','parcelado','prazo'));