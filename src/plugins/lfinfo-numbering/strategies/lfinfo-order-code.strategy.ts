import {
  Injector,
  OrderCodeStrategy,
  RequestContext,
} from '@vendure/core';

import {
  DocumentNumberService,
} from '../services/document-number.service';

export class LfinfoOrderCodeStrategy
  implements OrderCodeStrategy {

  private numberingService:
    DocumentNumberService;

  init(injector: Injector) {
    this.numberingService =
      injector.get(
        DocumentNumberService,
      );
  }

  async generate(
    ctx: RequestContext,
  ): Promise<string> {

    return this.numberingService
      .nextOrderNumber(ctx);
  }
}
