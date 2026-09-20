import {
  Injectable,
} from '@nestjs/common';

import {
  ID,
  OrderService,
  RequestContext,
  TransactionalConnection,
} from '@vendure/core';

import {
  OrderLicense,
  OrderLicenseStatus,
} from '../entities/order-license.entity';


export type LicenseRenewalStatus =
  | 'NONE'
  | 'AVAILABLE'
  | 'PENDING'
  | 'RENEWED'
  | 'EXPIRED';


@Injectable()
export class OrderLicenseService {

  constructor(
    private connection:
      TransactionalConnection,

    private orderService:
      OrderService,
  ) {}


  /**
   * Retourne toutes les licences
   * liées à une commande.
   */
  async findByOrder(
    ctx: RequestContext,
    orderId: ID,
  ): Promise<OrderLicense[]> {

    return this.connection
      .getRepository(
        ctx,
        OrderLicense,
      )
      .find({

        where: {
          orderId,
        },

        relations: {
          productVariant: {
            product: {
              translations: true,
            },

            translations: true,
          },
        },

        order: {
          orderLineId:
            'ASC',

          licenseIndex:
            'ASC',
        },
      });
  }


  /**
   * Retourne toutes les licences.
   *
   * Utilisé par la future page
   * globale "Sales > Licences"
   * du Dashboard.
   */
  async findAll(
    ctx: RequestContext,
  ): Promise<{
    items: OrderLicense[];
    totalItems: number;
  }> {

    const repo =
      this.connection.getRepository(
        ctx,
        OrderLicense,
      );

    const [
      items,
      totalItems,
    ] =
      await repo.findAndCount({

        relations: {
          order: {
            customer: true,
          },

          productVariant: {
            product: {
              translations: true,
            },

            translations: true,
          },
        },

        order: {
          expiresAt:
            'ASC',

          createdAt:
            'DESC',
        },
      });

    return {
      items,
      totalItems,
    };
  }


  /**
   * Vérifie les lignes de la commande
   * et crée les slots de licences
   * manquants.
   *
   * Exemple :
   *
   * quantity = 3
   *
   * =>
   *
   * licence 1
   * licence 2
   * licence 3
   */
  async syncOrderLicenses(
    ctx: RequestContext,
    orderId: ID,
  ): Promise<OrderLicense[]> {

    const order =
      await this.orderService.findOne(
        ctx,
        orderId,
        [
          'lines',
          'lines.productVariant',
        ],
      );

    if (!order) {
      throw new Error(
        `Commande ${orderId} introuvable`,
      );
    }

    const repo =
      this.connection.getRepository(
        ctx,
        OrderLicense,
      );

    for (
      const line
      of order.lines
    ) {

      const existing =
        await repo.find({
          where: {
            orderLineId:
              line.id,
          },
        });

      const existingIndexes =
        new Set(
          existing.map(
            item =>
              item.licenseIndex,
          ),
        );

      for (
        let index = 1;
        index <= line.quantity;
        index++
      ) {

        if (
          existingIndexes.has(
            index,
          )
        ) {
          continue;
        }

        const license =
          repo.create({

            orderId:
              order.id,

            orderLineId:
              line.id,

            productVariantId:
              line.productVariant.id,

            licenseIndex:
              index,

            /*
             * Provisioning
             */
            status:
              OrderLicenseStatus.PENDING,

            licenseKey:
              null,

            activationUrl:
              null,

            downloadUrl:
              null,

            instructions:
              null,

            deliveredAt:
              null,

            /*
             * Cycle de vie
             */
            activatedAt:
              null,

            expiresAt:
              null,

            durationMonths:
              null,

            /*
             * Renewal
             */
            renewalStatus:
              'NONE',

            renewalProductVariantId:
              null,

            renewedFromLicenseId:
              null,

            renewedToLicenseId:
              null,

            /*
             * Rappels automatiques
             */
            renewalReminder30SentAt:
              null,

            renewalReminder10SentAt:
              null,

            renewalReminder3SentAt:
              null,
          });

        await repo.save(
          license,
        );
      }
    }

    return this.findByOrder(
      ctx,
      orderId,
    );
  }


  /**
   * Modification d'une licence
   * depuis l'Admin API / Dashboard.
   *
   * L'expiration peut être :
   *
   * - saisie explicitement
   * - calculée automatiquement
   *   depuis activatedAt + durationMonths
   */
  async update(
    ctx: RequestContext,

    input: {

      id: ID;

      /*
       * Provisioning
       */
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

      /*
       * Cycle de vie
       */
      activatedAt?:
        Date | string | null;

      expiresAt?:
        Date | string | null;

      durationMonths?:
        number | null;

      /*
       * Renewal
       */
      renewalStatus?:
        LicenseRenewalStatus;

      renewalProductVariantId?:
        ID | null;
    },
  ): Promise<OrderLicense> {

    const repo =
      this.connection.getRepository(
        ctx,
        OrderLicense,
      );

    const license =
      await repo.findOne({
        where: {
          id:
            input.id,
        },
      });

    if (!license) {
      throw new Error(
        `Licence ${input.id} introuvable`,
      );
    }


    /**
     * On mémorise l'ancienne
     * date d'expiration AVANT
     * toute modification.
     *
     * Cela permettra de détecter
     * un véritable changement.
     */
    const previousExpiresAt =
      license.expiresAt
        ? new Date(
            license.expiresAt,
          )
        : null;


    /*
     * =========================
     * Provisioning
     * =========================
     */

    if (
      input.licenseKey !==
      undefined
    ) {

      license.licenseKey =
        this.clean(
          input.licenseKey,
        );
    }


    if (
      input.activationUrl !==
      undefined
    ) {

      license.activationUrl =
        this.clean(
          input.activationUrl,
        );
    }


    if (
      input.downloadUrl !==
      undefined
    ) {

      license.downloadUrl =
        this.clean(
          input.downloadUrl,
        );
    }


    if (
      input.instructions !==
      undefined
    ) {

      license.instructions =
        this.clean(
          input.instructions,
        );
    }


    if (
      input.status !==
      undefined
    ) {

      license.status =
        input.status;
    }


    /*
     * =========================
     * Durée
     * =========================
     */

    if (
      input.durationMonths !==
      undefined
    ) {

      if (
        input.durationMonths !==
          null &&
        (
          !Number.isInteger(
            input.durationMonths,
          ) ||
          input.durationMonths <=
            0
        )
      ) {

        throw new Error(
          'La durée doit être un nombre entier de mois supérieur à 0',
        );
      }

      license.durationMonths =
        input.durationMonths;
    }


    /*
     * =========================
     * Activation
     * =========================
     */

    if (
      input.activatedAt !==
      undefined
    ) {

      license.activatedAt =
        this.parseDate(
          input.activatedAt,
          "date d'activation",
        );
    }


    /*
     * =========================
     * Expiration
     * =========================
     *
     * Si expiresAt est envoyé,
     * la valeur manuelle prend
     * toujours priorité.
     */

    if (
      input.expiresAt !==
      undefined
    ) {

      license.expiresAt =
        this.parseDate(
          input.expiresAt,
          "date d'expiration",
        );

    } else if (
      input.activatedAt !==
        undefined ||
      input.durationMonths !==
        undefined
    ) {

      /*
       * Activation ou durée
       * modifiée sans expiration
       * explicite :
       *
       * recalcul automatique.
       */

      if (
        license.activatedAt &&
        license.durationMonths
      ) {

        license.expiresAt =
          this.addMonths(
            license.activatedAt,
            license.durationMonths,
          );

      } else {

        license.expiresAt =
          null;
      }
    }


    /*
     * L'expiration ne peut jamais
     * précéder l'activation.
     */

    if (
      license.activatedAt &&
      license.expiresAt &&
      license.expiresAt.getTime() <
        license.activatedAt.getTime()
    ) {

      throw new Error(
        "La date d'expiration ne peut pas être antérieure à la date d'activation",
      );
    }


    /*
     * =========================
     * Renewal
     * =========================
     */

    if (
      input.renewalStatus !==
      undefined
    ) {

      license.renewalStatus =
        input.renewalStatus;
    }


    if (
      input.renewalProductVariantId !==
      undefined
    ) {

      license.renewalProductVariantId =
        input
          .renewalProductVariantId ===
        null
          ? null
          : String(
              input
                .renewalProductVariantId,
            );
    }


    /*
     * =========================
     * Reset des rappels
     * =========================
     *
     * Si la date d'expiration
     * change réellement,
     * les rappels J-30/J-10/J-3
     * peuvent à nouveau être envoyés.
     */

    const expirationChanged =
      previousExpiresAt
        ?.getTime() !==
      license.expiresAt
        ?.getTime();


    if (
      expirationChanged
    ) {

      license
        .renewalReminder30SentAt =
        null;

      license
        .renewalReminder10SentAt =
        null;

      license
        .renewalReminder3SentAt =
        null;
    }


    /*
     * Si une licence était marquée
     * EXPIRED mais reçoit une nouvelle
     * date d'expiration future,
     * on la remet automatiquement
     * dans l'état normal.
     */

    if (
      license.expiresAt &&
      license.expiresAt.getTime() >
        Date.now() &&
      license.renewalStatus ===
        'EXPIRED'
    ) {

      license.renewalStatus =
        'NONE';
    }


    return repo.save(
      license,
    );
  }


  /**
   * Passe toutes les licences
   * READY d'une commande en DELIVERED.
   *
   * Les licences déjà DELIVERED
   * sont ignorées afin de garder
   * l'opération idempotente.
   */
  async markOrderDelivered(
    ctx: RequestContext,
    orderId: ID,
  ): Promise<OrderLicense[]> {

    const repo =
      this.connection.getRepository(
        ctx,
        OrderLicense,
      );

    const licenses =
      await repo.find({
        where: {
          orderId,
        },
      });


    if (
      licenses.length ===
      0
    ) {
      return [];
    }


    const notReady =
      licenses.filter(
        license =>
          license.status !==
            OrderLicenseStatus.READY &&
          license.status !==
            OrderLicenseStatus.DELIVERED,
      );


    if (
      notReady.length >
      0
    ) {

      throw new Error(
        `${notReady.length} licence(s) ne sont pas prêtes`,
      );
    }


    const now =
      new Date();


    for (
      const license
      of licenses
    ) {

      /*
       * Idempotence :
       * ne jamais livrer deux fois
       * la même licence.
       */

      if (
        license.status ===
        OrderLicenseStatus.DELIVERED
      ) {
        continue;
      }


      license.status =
        OrderLicenseStatus.DELIVERED;

      license.deliveredAt =
        now;


      await repo.save(
        license,
      );
    }


    return this.findByOrder(
      ctx,
      orderId,
    );
  }


  /**
   * Nettoyage des champs texte.
   */
  private clean(
    value?:
      string | null,
  ): string | null {

    const result =
      value?.trim();

    return result
      ? result
      : null;
  }


  /**
   * Conversion sécurisée
   * Date|string -> Date.
   */
  private parseDate(
    value:
      Date | string | null,

    label:
      string,
  ): Date | null {

    if (
      value === null
    ) {
      return null;
    }


    const result =
      value instanceof Date
        ? new Date(
            value.getTime(),
          )
        : new Date(
            value,
          );


    if (
      Number.isNaN(
        result.getTime(),
      )
    ) {

      throw new Error(
        `${label} invalide`,
      );
    }


    return result;
  }


  /**
   * Ajoute un nombre de mois
   * en évitant les débordements
   * du type :
   *
   * 31 janvier + 1 mois.
   */
  private addMonths(
    date:
      Date,

    months:
      number,
  ): Date {

    const result =
      new Date(
        date.getTime(),
      );


    const originalDay =
      result.getDate();


    /*
     * On passe temporairement
     * au premier du mois.
     */
    result.setDate(
      1,
    );


    result.setMonth(
      result.getMonth() +
        months,
    );


    /*
     * Dernier jour
     * du mois cible.
     */
    const lastDay =
      new Date(
        result.getFullYear(),
        result.getMonth() + 1,
        0,
      ).getDate();


    result.setDate(
      Math.min(
        originalDay,
        lastDay,
      ),
    );


    return result;
  }
}
