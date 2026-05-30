import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_USER_AGENT = Deno.env.get("ASAAS_USER_AGENT") || "EternusRelogios/1.0";

function sanitizeApiKey(value?: string | null) {
  return (value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+/g, "");
}

function getAsaasApiUrl(apiKey: string) {
  const configuredUrl = Deno.env.get("ASAAS_API_URL")?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (apiKey.startsWith("$aact_hmlg_")) return "https://api-sandbox.asaas.com/v3";
  return "https://api.asaas.com/v3";
}

async function asaasRequest(path: string, apiKey: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("User-Agent", ASAAS_USER_AGENT);
  headers.set("access_token", apiKey);

  const response = await fetch(`${getAsaasApiUrl(apiKey)}${path}`, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.errors) {
    const message = data.errors?.[0]?.description || data.message || "Erro ao comunicar com o Asaas.";
    throw new Error(message);
  }

  return data;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { paymentId } = await req.json();
    const ASAAS_API_KEY = sanitizeApiKey(Deno.env.get("ASAAS_API_KEY"));

    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY nao configurada no Supabase.");
    }

    if (!paymentId) {
      throw new Error("PaymentId é obrigatório.");
    }

    // Primeiro buscamos o pagamento para confirmar se é PIX e se está pendente
    const paymentData = await asaasRequest(`/payments/${paymentId}`, ASAAS_API_KEY);

    if (paymentData.billingType !== "PIX") {
      throw new Error("Este pagamento não é via PIX.");
    }

    if (paymentData.status !== "PENDING" && paymentData.status !== "OVERDUE") {
      throw new Error(`Pagamento não está mais pendente (Status: ${paymentData.status}).`);
    }

    const qrCodeData = await asaasRequest(`/payments/${paymentId}/pixQrCode`, ASAAS_API_KEY);

    return new Response(
      JSON.stringify({
        pixCode: qrCodeData?.payload,
        pixImage: qrCodeData?.encodedImage,
        expirationDate: qrCodeData?.expirationDate,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("get_asaas_pix_qrcode_error:", error.message);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
