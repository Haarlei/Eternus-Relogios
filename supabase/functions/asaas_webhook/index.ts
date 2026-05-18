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
    console.log("Webhook Asaas recebido:", JSON.stringify(body, null, 2));

    // Camada de segurança: Validar o Token do Webhook (se estiver configurado)
    const asaasToken = req.headers.get("asaas-access-token");
    const configuredToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

    if (configuredToken && asaasToken !== configuredToken) {
      console.error("Tentativa de acesso não autorizada ao Webhook. Token inválido.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const event = body.event;
    const payment = body.payment;
    if (!payment) {
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const orderId = payment.externalReference;

    // Se o pagamento foi confirmado ou recebido
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      if (!orderId) {
        console.error("Pedido não identificado no webhook");
        return new Response("No externalReference", { status: 400 });
      }

      // Atualiza o pedido no banco
      const { error } = await supabase
        .from("pedidos")
        .update({
          status: "Pago",
          order_nsu: payment.id,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) {
        console.error("Erro ao atualizar pedido:", error);
        throw error;
      }

      console.log(`Pedido ${orderId} atualizado para Pago via Asaas.`);
    }

    if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
      if (orderId) {
        await supabase
          .from("pedidos")
          .update({
            status: "Cancelado",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("status", "Aguardando Pagamento");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro no Webhook Asaas:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
