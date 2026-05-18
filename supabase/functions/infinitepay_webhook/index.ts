import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("Webhook InfinitePay recebido:", JSON.stringify(body, null, 2));

    // A estrutura da InfinitePay pode variar conforme a versão/evento
    // Tentamos extrair o order_id dos metadados
    const event = body.event;
    const data = body.data || body;
    const metadata = data.metadata || (data.attributes?.metadata);
    const orderId = metadata?.order_id;

    if (!orderId) {
      console.error("Pedido não identificado no webhook");
      return new Response(JSON.stringify({ error: "No order_id found" }), { status: 400 });
    }

    // Se o pagamento foi aprovado/pago
    const status = data.status || data.attributes?.status;
    const isPaid = ["approved", "paid", "confirmed", "success"].includes(status?.toLowerCase());

    if (isPaid) {
      // Extrai dados do cliente e endereço retornados pela InfinitePay (se houver)
      const customer = data.customer || data.attributes?.customer;
      const payment = data.payment || data.attributes?.payment_method_details || data.attributes?.payment;

      // Monta um objeto rico de informações
      const infoEntrega = {
        cliente: {
          nome: customer?.name,
          email: customer?.email,
          telefone: customer?.phone_number || customer?.phone,
        },
        endereco: customer?.address || customer?.shipping_address,
        pagamento: {
          metodo: data.payment_method || data.attributes?.payment_method,
          parcelas: data.installments || data.attributes?.installments,
          detalhes: payment,
          data_pagamento: new Date().toISOString(),
        }
      };

      // Atualiza o pedido no banco
      const { error } = await supabase
        .from("pedidos")
        .update({
          status: "Pago",
          endereco_entrega: infoEntrega,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) {
        console.error("Erro ao atualizar pedido:", error);
        throw error;
      }

      console.log(`Pedido ${orderId} atualizado para Pago com sucesso.`);
    } else {
      console.log(`Evento ${event} com status ${status} ignorado para o pedido ${orderId}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro no Webhook:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
