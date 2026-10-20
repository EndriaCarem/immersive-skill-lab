/** Integration ports only. Implement provider calls after credentials and setup are authorized. */
export interface PaymentProvider {
  createPayment(input: {
    orderId: string;
    amountCents: number;
    method: "pix" | "boleto" | "card";
    installments: number;
  }): Promise<{ externalId: string; paymentUrl: string }>;
  verifyNotification(request: Request): Promise<{ externalId: string; status: "paid" | "pending" | "rejected" | "refunded" }>;
}
export interface CommerceEmailProvider {
  sendCancellation(input: { orderId: string; recipient: string; idempotencyKey: string }): Promise<{ sent: boolean }>;
}
export const commerceIntegrationState = {
  payment: { provider: "mercado_pago", enabled: false },
  email: { provider: "resend", enabled: false },
} as const;