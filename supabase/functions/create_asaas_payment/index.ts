import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_USER_AGENT = Deno.env.get("ASAAS_USER_AGENT") || "EternusRelogios/1.0";

function onlyDigits(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

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
    const { amount, customer, orderId, redirectUrl, billingType = "PIX" } = await req.json();
    const ASAAS_API_KEY = sanitizeApiKey(Deno.env.get("ASAAS_API_KEY"));

    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY nao configurada no Supabase.");
    }

    console.log("asaas_key_diagnostic:", {
      length: ASAAS_API_KEY.length,
      prefix: ASAAS_API_KEY.slice(0, 11),
      endpoint: getAsaasApiUrl(ASAAS_API_KEY),
    });

    if (!amount || !customer || !orderId) {
      throw new Error("Dados obrigatorios ausentes para criar pagamento.");
    }

    const cpfCnpj = onlyDigits(customer.cpf);
    if (!cpfCnpj) {
      throw new Error("CPF/CNPJ e obrigatorio para criar o cliente no Asaas.");
    }

    const customers = await asaasRequest(`/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`, ASAAS_API_KEY);

    let asaasCustomerId = customers.data?.[0]?.id;
    if (!asaasCustomerId) {
      const customerData = await asaasRequest("/customers", ASAAS_API_KEY, {
        method: "POST",
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          mobilePhone: onlyDigits(customer.phone),
          cpfCnpj,
          address: customer.address?.rua,
          addressNumber: customer.address?.numero,
          complement: customer.address?.complemento || undefined,
          province: customer.address?.bairro,
          postalCode: onlyDigits(customer.address?.cep),
          externalReference: customer.id,
          notificationDisabled: true,
        }),
      });
      asaasCustomerId = customerData.id;
    }

    const dueDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const paymentData = await asaasRequest("/payments", ASAAS_API_KEY, {
      method: "POST",
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: billingType,
        value: Number(amount),
        dueDate,
        externalReference: orderId,
        description: `Pedido #${orderId.slice(0, 8).toUpperCase()} - Eternus Relogios`,
        callback: redirectUrl
          ? {
              successUrl: redirectUrl,
              autoRedirect: true,
            }
          : undefined,
      }),
    });

    let qrCodeData = null;
    if (billingType === "PIX") {
      qrCodeData = await asaasRequest(`/payments/${paymentData.id}/pixQrCode`, ASAAS_API_KEY);
    }

    return new Response(
      JSON.stringify({
        paymentId: paymentData.id,
        pixCode: qrCodeData?.payload,
        pixImage: qrCodeData?.encodedImage,
        expirationDate: qrCodeData?.expirationDate,
        invoiceUrl: paymentData.invoiceUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("create_asaas_payment_error:", error.message);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
