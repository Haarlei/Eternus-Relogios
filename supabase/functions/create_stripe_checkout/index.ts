import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Corpo da requisição recebido:", JSON.stringify(body));
    
    const { items, order_id, customer_email, redirect_url } = body;

    if (!items || items.length === 0) {
      throw new Error("Nenhum item enviado no carrinho.");
    }

    // Mapeia os itens do carrinho para o formato da Stripe
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: "brl",
        product_data: {
          name: item.nome_produto || "Produto Eternus",
        },
        unit_amount: Math.round(Number(item.preco) * 100), // Garante que seja número
      },
      quantity: Math.max(1, Number(item.quantidade)),
    }));

    console.log("Iniciando criação de sessão Stripe para o pedido:", order_id);

    // Cria a sessão de checkout na Stripe apenas com Cartão por enquanto
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      customer_email: customer_email || undefined,
      success_url: `${redirect_url}&status=success`,
      cancel_url: `${redirect_url}&status=cancel`,
      metadata: {
        order_id: order_id,
      },
    });

    console.log("Sessão Stripe criada com sucesso:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("ERRO DETALHADO STRIPE:", error.message);
    console.error("STACK TRACE:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Verifique os logs da função no painel do Supabase para mais detalhes."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
