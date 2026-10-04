type ErrorBody = {
  message?: string;
  fields?: Array<{ field: string; message: string }>;
};

const fieldLabels: Record<string, string> = {
  ratePerBag: "Rate per bag",
  quantity: "Number of bags",
  amount: "Total amount",
  advancePaid: "Advance amount",
  primaryPhone: "Primary phone",
  alternativePhone: "Alternative phone",
  customerId: "Customer",
  product: "Type of bag",
  bagType: "Type of bag",
  gsm: "GSM",
  bagColor: "Color of bag",
  gstNumber: "GST number",
  expectedDelivery: "Delivery date",
};

export function apiErrorMessage(body: ErrorBody): string {
  if (body.fields?.length) {
    return body.fields.map(({ field, message }) => {
      const label = fieldLabels[field] ?? field.replace(/([a-z])([A-Z])/g, "$1 $2");
      return `${label}: ${message}`;
    }).join("; ");
  }
  return body.message ?? "The request could not be completed. Please try again.";
}
