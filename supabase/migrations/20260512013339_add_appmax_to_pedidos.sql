-- Add Appmax to allowed payment methods
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_metodo_pagamento_check;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_metodo_pagamento_check CHECK (metodo_pagamento IN ('Online (InfinitePay)', 'WhatsApp', 'Online (Stripe)', 'Online (Appmax)'));
