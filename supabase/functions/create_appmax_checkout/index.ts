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
    const { items, order_id, customer, redirect_url } = await req.json();
    const API_KEY = Deno.env.get("APPMAX_API_KEY");

    if (!API_KEY) {
      throw new Error("Configuração APPMAX_API_KEY não encontrada.");
    }

    // Mapeia os itens para o formato Appmax
    const cartItems = items.map((item: any) => ({
      product_id: item.produto_id || 1,
      product_name: item.nome_produto,
      product_qty: item.quantidade,
      product_price: item.preco,
    }));

    // Monta o payload para a Appmax
    // Documentação: https://appmax.readme.io/
    const payload = {
      "access-token": API_KEY,
      "cart": {
        "products": cartItems
      },
      "customer": {
        "firstname": customer.name.split(' ')[0],
        "lastname": customer.name.split(' ').slice(1).join(' ') || "S.",
        "email": customer.email,
        "telephone": customer.phone?.replace(/\D/g, ""),
        "cpf": customer.cpf?.replace(/\D/g, ""),
      },
      "address": {
        "zipcode": customer.address.cep?.replace(/\D/g, ""),
        "street": customer.address.rua,
        "number": customer.address.numero,
        "complement": customer.address.complemento || "",
        "district": customer.address.bairro,
        "city": customer.address.cidade,
        "state": customer.address.estado,
      },
      "config": {
        "url_success": redirect_url,
        "url_failure": redirect_url,
      }
    };

    const response = await fetch("https://admin.appmax.com.br/api/v3/payment/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.success) {
      console.error("Erro Appmax:", data);
      throw new Error(data.data?.message || "Erro ao criar checkout na Appmax");
    }

    // A Appmax retorna a URL do checkout em data.data.url
    return new Response(JSON.stringify({ url: data.data.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro interno:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
