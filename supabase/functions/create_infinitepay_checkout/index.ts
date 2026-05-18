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
    const { items, total_amount, order_id, customer, redirect_url } = await req.json();

    // InfiniteTag (handle) da sua conta
    const INFINITETAG = "haarley";

    // Monta o array de itens para a API
    const formattedItems = items.map((item: any) => ({
      description: item.nome_produto || "Relógio",
      quantity: item.quantidade,
      price: Math.round(item.preco * 100), // Preço unitário em centavos
    }));

    // Calcula o valor total em centavos para garantir consistência
    const totalAmountCents = items.reduce((acc: number, item: any) => acc + (Math.round(item.preco * 100) * item.quantidade), 0);

    // 1. Monta o corpo da requisição com redundância para garantir o preenchimento
    const checkoutPayload: any = {
      handle: INFINITETAG,
      amount: totalAmountCents, // Valor total em centavos na raiz
      items: formattedItems,
      redirect_url: redirect_url || "https://eternusrelogios.shop/sucesso",
      metadata: {
        order_id: order_id || "",
      },
      // Tentativa de preenchimento usando múltiplos padrões da API
      customer: customer ? {
        name: customer.name,
        email: customer.email,
        phone: customer.phone?.replace(/\D/g, ""),
        document: customer.cpf?.replace(/\D/g, ""), // Caso CPF seja fornecido
      } : undefined,
      // Alguns endpoints da InfinitePay preferem o objeto de endereço separado
      shipping_address: customer?.address ? {
        zip_code: customer.address.cep?.replace(/\D/g, ""),
        street: customer.address.rua,
        number: customer.address.numero,
        complement: customer.address.complemento || "",
        neighborhood: customer.address.bairro,
        city: customer.address.cidade,
        state: customer.address.estado,
      } : undefined
    };

    // Adiciona o objeto de endereço também dentro do cliente para redundância
    if (checkoutPayload.customer && checkoutPayload.shipping_address) {
      checkoutPayload.customer.address = checkoutPayload.shipping_address;
    }

    // 3. Faz a chamada para a API da InfinitePay
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
