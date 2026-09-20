import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import {
  Allow,
  Ctx,
  ID,
  Permission,
  RequestContext,
  Transaction,
} from '@vendure/core';

import {
  OrderLicense,
  OrderLicenseStatus,
} from '../entities/order-license.entity';

import {
  LicenseRenewalStatus,
  OrderLicenseService,
} from '../services/order-license.service';

import {
  LicenseRenewalService,
} from '../renewals/license-renewal.service';

import type {
  LicenseReminderDays,
} from '../renewals/license-renewal-reminder.event';

type LicenseReminderType =
  | 'AUTO'
  | 'DAYS_30'
  | 'DAYS_10'
  | 'DAYS_3';

@Resolver()
export class OrderLicenseAdminResolver {

  constructor(
    private licenses:
      OrderLicenseService,

    private renewals:
      LicenseRenewalService,
  ) {}

  /**
   * Toutes les licences.
   */
  @Query()
  @Allow(Permission.ReadOrder)
  lfinfoLicenses(
    @Ctx()
    ctx: RequestContext,
  ) {

    return this.licenses
      .findAll(ctx);
  }

  /**
   * Licences d'une commande.
   */
  @Query()
  @Allow(Permission.ReadOrder)
  lfinfoOrderLicenses(
    @Ctx()
    ctx: RequestContext,

    @Args()
    args: {
      orderId: ID;
    },
  ) {

    return this.licenses
      .findByOrder(
        ctx,
        args.orderId,
      );
  }

  /**
   * Synchronisation des slots.
   */
  @Mutation()
  @Transaction()
  @Allow(Permission.UpdateOrder)
  lfinfoSyncOrderLicenses(
    @Ctx()
    ctx: RequestContext,

    @Args()
    args: {
      orderId: ID;
    },
  ) {

    return this.licenses
      .syncOrderLicenses(
        ctx,
        args.orderId,
      );
  }

  /**
   * Modification d'une licence.
   */
  @Mutation()
  @Transaction()
  @Allow(Permission.UpdateOrder)
  lfinfoUpdateOrderLicense(
    @Ctx()
    ctx: RequestContext,

    @Args()
    args: {

      input: {

        id: ID;

        licenseKey?:
          string | null;

        activationUrl?:
          string | null;

        downloadUrl?:
          string | null;

        instructions?:
          string | null;

        status?:
          OrderLicenseStatus;

        activatedAt?:
          Date | string | null;

        expiresAt?:
          Date | string | null;

        durationMonths?:
          number | null;

        renewalStatus?:
          LicenseRenewalStatus;

        renewalProductVariantId?:
          ID | null;
      };
    },
  ) {

    return this.licenses.update(
      ctx,
      args.input,
    );
  }

  /**
   * Envoi manuel d'un rappel.
   *
   * IMPORTANT :
   * cet envoi ne doit pas modifier
   * renewalReminderXXSentAt.
   */
  @Mutation()
  @Allow(Permission.UpdateOrder)
  async lfinfoSendLicenseReminder(
    @Ctx()
    ctx: RequestContext,

    @Args()
    args: {
      licenseId: ID;
      reminderType?:
        LicenseReminderType;
    },
  ) {

    const reminderDays =
      this.reminderTypeToDays(
        args.reminderType ??
        'AUTO',
      );

    return this.renewals
      .sendManualReminder(
        ctx,
        String(args.licenseId),
        reminderDays,
      );
  }

  /**
   * Réinitialise uniquement
   * l'historique des rappels.
   */
  @Mutation()
  @Transaction()
  @Allow(Permission.UpdateOrder)
  lfinfoResetLicenseReminders(
    @Ctx()
    ctx: RequestContext,

    @Args()
    args: {
      licenseId: ID;
    },
  ) {

    return this.renewals
      .resetReminderHistory(
        ctx,
        String(args.licenseId),
      );
  }

  private reminderTypeToDays(
    reminderType:
      LicenseReminderType,
  ): LicenseReminderDays | undefined {

    switch (reminderType) {

      case 'DAYS_30':
        return 30;

      case 'DAYS_10':
        return 10;

      case 'DAYS_3':
        return 3;

      case 'AUTO':
      default:
        return undefined;
    }
  }
}


/**
 * Champs calculés Admin.
 */
@Resolver('OrderLicense')
export class OrderLicenseFieldResolver {

  @ResolveField()
  productName(
    @Parent()
    license: OrderLicense,
  ): string {

    const product =
      license.productVariant
        ?.product;

    return (
      product
        ?.translations
        ?.[0]
        ?.name ??
      `Produit ${license.productVariantId}`
    );
  }

  @ResolveField()
  variantName(
    @Parent()
    license: OrderLicense,
  ): string {

    return (
      license
        .productVariant
        ?.translations
        ?.[0]
        ?.name ??
      `Variante ${license.productVariantId}`
    );
  }

  @ResolveField()
  orderCode(
    @Parent()
    license: OrderLicense,
  ): string {

    return (
      license.order?.code ??
      String(license.orderId)
    );
  }

  @ResolveField()
  customerFirstName(
    @Parent()
    license: OrderLicense,
  ): string | null {

    return (
      license.order
        ?.customer
        ?.firstName ??
      null
    );
  }

  @ResolveField()
  customerLastName(
    @Parent()
    license: OrderLicense,
  ): string | null {

    return (
      license.order
        ?.customer
        ?.lastName ??
      null
    );
  }

  @ResolveField()
  customerEmail(
    @Parent()
    license: OrderLicense,
  ): string | null {

    return (
      license.order
        ?.customer
        ?.emailAddress ??
      null
    );
  }
}
