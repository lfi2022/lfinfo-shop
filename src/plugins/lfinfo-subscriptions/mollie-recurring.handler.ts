import crypto from 'crypto';
import { LanguageCode, PaymentMethodHandler } from '@vendure/core';
export const mollieRecurringPaymentHandler = new PaymentMethodHandler({ code: 'lfinfo-mollie-recurring', description: [{ languageCode: LanguageCode.en, value: 'LFINFO Mollie recurring payment' }], args: {}, createPayment: async (_ctx, order, amount, _args, metadata) => {
  const id = String(metadata.molliePaymentId ?? ''); const signature = String(metadata.signature ?? '');
  const expected = crypto.createHmac('sha256', process.env.MOLLIE_RECURRING_WEBHOOK_SECRET ?? '').update(`${order.id}:${id}`).digest('hex');
  if (!id || !process.env.MOLLIE_RECURRING_WEBHOOK_SECRET || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return { amount, state: 'Declined' as const, metadata: { errorMessage: 'Paiement récurrent Mollie non vérifié' } };
  return { amount, state: 'Settled' as const, transactionId: id, metadata: { molliePaymentId: id } };
} });
