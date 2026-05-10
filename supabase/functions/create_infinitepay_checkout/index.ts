import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Tratamento de requisições OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Pega os dados enviados pelo Front-end
    const { items, total_amount, metadata, redirect_url } = await req.json();

    // InfiniteTag (handle) da sua conta
    const INFINITETAG = "haarley";
    
    // Identificador único do pedido (nsu) gerado no momento
    const order_nsu = `ETERNUS-${Date.now()}`;

    // Monta o array de itens para a API
    const formattedItems = items.map((item: any) => ({
      description: item.nome_produto || "Relógio",
      quantity: item.quantidade,
      price: Math.round(item.preco * 100), // Preço unitário em centavos
    }));

    // 1. Monta o corpo da requisição
    const checkoutPayload = {
      handle: INFINITETAG,
      items: formattedItems,
      // URL onde você quer que o cliente caia depois do pagamento
      redirect_url: redirect_url || "https://eternusrelogios.shop/sucesso", 
    };

    // 2. Faz a chamada para a API da InfinitePay (Endpoint sem autenticação, validado pelo handle)
    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro da API InfinitePay:", data);
      throw new Error(`Erro InfinitePay: ${data.message || 'Falha ao criar checkout'}`);
    }

    // A API costuma retornar o link diretamente ou dentro de um objeto
    // Vamos garantir que pegamos a URL corretamente
    const checkoutUrl = data.url || data.payment_url || data.link;

    if (!checkoutUrl) {
      throw new Error("API não retornou a URL de checkout");
    }

    // Retorna a URL do Checkout gerado para o front-end
    return new Response(JSON.stringify({ checkout_url: checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro interno:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
