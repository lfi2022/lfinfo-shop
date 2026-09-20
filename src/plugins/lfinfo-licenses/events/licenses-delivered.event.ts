import {
  Order,
  RequestContext,
  VendureEvent,
} from '@vendure/core';

import {
  OrderLicense,
} from '../entities/order-license.entity';

export class LicensesDeliveredEvent extends VendureEvent {
  constructor(
    public ctx: RequestContext,
    public order: Order,
    public licenses: OrderLicense[],
  ) {
    super();
  }
}
