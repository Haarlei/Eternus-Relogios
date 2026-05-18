import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    let event;
    if (webhookSecret) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      // Modo desenvolvimento ou sem segredo (não recomendado para produção)
      event = JSON.parse(body);
    }

    console.log(`Evento recebido: ${event.type}`);

    // Processa a conclusão do pagamento
    if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
      const session = event.data.object;
      const orderId = session.metadata?.order_id || session.payment_intent_data?.metadata?.order_id;

      if (orderId) {
        console.log(`Atualizando pedido ${orderId} para Pago...`);
        
        const { error } = await supabase
          .from("pedidos")
          .update({ status: "Pago" })
          .eq("id", orderId);

        if (error) {
          console.error(`Erro ao atualizar pedido ${orderId}:`, error);
          return new Response("Database error", { status: 500 });
        }
        
        console.log(`Pedido ${orderId} atualizado com sucesso!`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error(`Erro no Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
