import {
  Args,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import {
  Allow,
  Ctx,
  ID,
  OrderService,
  Permission,
  RequestContext,
} from '@vendure/core';

import {
  OrderLicense,
  OrderLicenseStatus,
} from '../entities/order-license.entity';

import {
  OrderLicenseService,
} from '../services/order-license.service';

@Resolver()
export class OrderLicenseShopResolver {

  constructor(
    private licenses:
      OrderLicenseService,

    private orderService:
      OrderService,
  ) {}

  @Query()
  @Allow(Permission.Authenticated)
  async lfinfoMyOrderLicenses(
    @Ctx()
    ctx: RequestContext,

    @Args()
    args: {
      orderId: ID;
    },
  ) {

    /*
     * Utilisateur actuellement connecté
     * à la Shop API.
     */
    const userId =
      ctx.activeUserId;

    if (!userId) {
      throw new Error(
        'Authentification requise',
      );
    }

    /*
     * On charge la commande
     * avec le client et son User.
     */
    const order =
      await this.orderService.findOne(
        ctx,
        args.orderId,
        [
          'customer',
          'customer.user',
        ],
      );

    if (!order) {
      throw new Error(
        'Commande introuvable',
      );
    }

    /*
     * Vérification obligatoire :
     * cette commande doit appartenir
     * au client actuellement connecté.
     */
    if (
      !order.customer?.user ||
      String(
        order.customer.user.id,
      ) !== String(userId)
    ) {
      throw new Error(
        'Accès refusé à cette commande',
      );
    }

    return this.licenses.findByOrder(
      ctx,
      args.orderId,
    );
  }
}

@Resolver('MyOrderLicense')
export class OrderLicenseShopFieldResolver {

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

  /*
   * Les informations sensibles
   * ne deviennent visibles que
   * lorsque la licence est DELIVERED.
   */

  @ResolveField()
  licenseKey(
    @Parent()
    license: OrderLicense,
  ): string | null {

    if (
      license.status !==
      OrderLicenseStatus.DELIVERED
    ) {
      return null;
    }

    return license.licenseKey;
  }

  @ResolveField()
  activationUrl(
    @Parent()
    license: OrderLicense,
  ): string | null {

    if (
      license.status !==
      OrderLicenseStatus.DELIVERED
    ) {
      return null;
    }

    return license.activationUrl;
  }

  @ResolveField()
  downloadUrl(
    @Parent()
    license: OrderLicense,
  ): string | null {

    if (
      license.status !==
      OrderLicenseStatus.DELIVERED
    ) {
      return null;
    }

    return license.downloadUrl;
  }

  @ResolveField()
  instructions(
    @Parent()
    license: OrderLicense,
  ): string | null {

    if (
      license.status !==
      OrderLicenseStatus.DELIVERED
    ) {
      return null;
    }

    return license.instructions;
  }
}
