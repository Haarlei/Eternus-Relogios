import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { items, customer } = body;
    
    console.log("Processando checkout Yampi para:", customer?.email);
    console.log("Itens:", JSON.stringify(items));

    const YAMPI_TOKEN = Deno.env.get("YAMPI_TOKEN");
    const YAMPI_SECRET = Deno.env.get("YAMPI_SECRET");
    const YAMPI_ALIAS = Deno.env.get("YAMPI_ALIAS");

    if (!YAMPI_TOKEN || !YAMPI_SECRET || !YAMPI_ALIAS) {
      console.error("ERRO: Credenciais da Yampi (TOKEN, SECRET ou ALIAS) não configuradas.");
      throw new Error("Configuração incompleta: YAMPI_TOKEN, YAMPI_SECRET ou YAMPI_ALIAS não definidos no Supabase.");
    }

    // Prepara os itens
    const cartItems = items.map((item: any) => ({
      sku: item.sku || item.id,
      title: item.nome_produto,
      quantity: item.quantidade,
      price: item.preco,
    }));

    if (cartItems.length === 0) {
      throw new Error("O carrinho está vazio.");
    }

    // Yampi Capsule Checkout (Redirect Direto)
    // Para múltiplos itens, a Yampi recomenda usar a API de Checkout ou montar um link de carrinho.
    // Como simplificação inicial, usamos o primeiro item para o checkout "Capsule".
    const firstItem = cartItems[0];
    const checkoutUrl = `https://seguro.yampi.com.br/capsule/buy?alias=${YAMPI_ALIAS}&sku=${firstItem.sku}&qty=${firstItem.quantity}`;

    const fullUrl = new URL(checkoutUrl);
    
    // Pre-povoamento de dados do cliente para facilitar a conversão
    if (customer) {
      if (customer.email) fullUrl.searchParams.append('email', customer.email);
      if (customer.name) fullUrl.searchParams.append('name', customer.name);
      if (customer.phone) fullUrl.searchParams.append('phone', customer.phone);
    }

    console.log("Checkout URL gerada:", fullUrl.toString());

    return new Response(JSON.stringify({ url: fullUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro no Edge Function Yampi:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
