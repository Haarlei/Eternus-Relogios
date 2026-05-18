-- Keep historical Yampi orders valid while allowing Asaas checkout
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_metodo_pagamento_check;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_metodo_pagamento_check
CHECK (metodo_pagamento IN ('Online (InfinitePay)', 'WhatsApp', 'Online (Stripe)', 'Online (Appmax)', 'Online (Yampi)', 'Online (Asaas)'));
