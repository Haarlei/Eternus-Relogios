-- Run this in Supabase SQL Editor if checkout fails with:
-- new row for relation "pedidos" violates check constraint "pedidos_metodo_pagamento_check"
--
-- This list includes the payment methods already found in the production table:
-- Online (InfinitePay), Online (Yampi), Online (Stripe), WhatsApp.

ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_metodo_pagamento_check;

ALTER TABLE public.pedidos
ADD CONSTRAINT pedidos_metodo_pagamento_check
CHECK (
  metodo_pagamento IN (
    'Online (InfinitePay)',
    'WhatsApp',
    'Online (Stripe)',
    'Online (Appmax)',
    'Online (Yampi)',
    'Online (Asaas)'
  )
);

-- Optional: inspect old values that prevent immediate validation.
SELECT metodo_pagamento, COUNT(*) AS total
FROM public.pedidos
GROUP BY metodo_pagamento
ORDER BY total DESC, metodo_pagamento;
