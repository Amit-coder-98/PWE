export const orderTotal = (rate: number, quantity: number) =>
  (Math.round(rate * 100) * quantity) / 100;

export const remainingAmount = (total: number, advance: number) =>
  Math.max(0, (Math.round(total * 100) - Math.round(advance * 100)) / 100);

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
