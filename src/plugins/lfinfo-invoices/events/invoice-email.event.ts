import {
  RequestContext,
  VendureEvent,
} from '@vendure/core';

export interface InvoiceEmailPayload {
  orderId: string;
  orderCode: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  invoiceUrl: string;
}

export class InvoiceEmailEvent extends VendureEvent {
  constructor(
    public ctx: RequestContext,
    public payload: InvoiceEmailPayload,
  ) {
    super();
  }
}
