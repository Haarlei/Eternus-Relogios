export const maskPhone = (value: string) => {
  if (!value) return "";
  value = value.replace(/\D/g, "");
  value = value.replace(/(\d{2})(\d)/, "($1) $2");
  value = value.replace(/(\d{5})(\d)/, "$1-$2");
  return value.substring(0, 15);
};

export const maskCurrency = (value: string | number) => {
  if (value === undefined || value === null) return "";
  const amount = typeof value === "number" ? value.toFixed(2) : value.replace(/\D/g, "");
  
  if (typeof value === "string") {
    const numericValue = parseInt(amount) / 100;
    if (isNaN(numericValue)) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numericValue);
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const unmaskValue = (value: string) => {
  return value.replace(/\D/g, "");
};

export const unmaskCurrency = (value: string) => {
  const numeric = value.replace(/\D/g, "");
  return parseInt(numeric) / 100;
};
