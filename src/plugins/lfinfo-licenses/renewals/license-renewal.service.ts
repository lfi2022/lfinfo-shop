import {
  Injectable,
} from '@nestjs/common';

import {
  EventBus,
  RequestContext,
  RequestContextService,
  TransactionalConnection,
} from '@vendure/core';

import {
  IsNull,
  Not,
} from 'typeorm';

import {
  OrderLicense,
} from '../entities/order-license.entity';

import {
  LicenseReminderDays,
  LicenseRenewalReminderEvent,
} from './license-renewal-reminder.event';

type ReminderSentField =
  | 'renewalReminder30SentAt'
  | 'renewalReminder10SentAt'
  | 'renewalReminder3SentAt';

@Injectable()
export class LicenseRenewalService {

  constructor(
    private connection:
      TransactionalConnection,

    private requestContextService:
      RequestContextService,

    private eventBus:
      EventBus,
  ) {}


  /**
   * Active une licence.
   *
   * Si durationMonths est défini,
   * expiresAt est calculé automatiquement.
   */
  async activateLicense(
    ctx: RequestContext,
    licenseId: string,
    activatedAt = new Date(),
  ): Promise<OrderLicense> {

    const repo =
      this.connection.getRepository(
        ctx,
        OrderLicense,
      );

    const license =
      await repo.findOne({
        where: {
          id: licenseId as any,
        },
      });

    if (!license) {
      throw new Error(
        `Licence ${licenseId} introuvable`,
      );
    }

    license.activatedAt =
      activatedAt;

    if (license.durationMonths) {
      license.expiresAt =
        this.addMonths(
          activatedAt,
          license.durationMonths,
        );
    }

    if (license.expiresAt) {
      license.renewalStatus =
        'NONE';
    }

    /**
     * Nouvelle activation =
     * nouvel historique de rappels.
     */
    license.renewalReminder30SentAt =
      null;

    license.renewalReminder10SentAt =
      null;

    license.renewalReminder3SentAt =
      null;

    return repo.save(
      license,
    );
  }


  /**
   * Traitement quotidien lancé
   * par le Vendure worker.
   *
   * Rappels :
   *
   * J-30
   * J-10
   * J-3
   *
   * Une fenêtre de tolérance
   * d'un jour est utilisée :
   *
   * J30 => J30/J29
   * J10 => J10/J9
   * J3  => J3/J2
   *
   * Cela permet de supporter
   * un worker arrêté pendant
   * quelques heures sans faire
   * de rattrapage catastrophique.
   */
  async processRenewals(): Promise<{
    checked: number;

    reminders30: number;
    reminders10: number;
    reminders3: number;

    expired: number;
  }> {

    const ctx =
      await this.requestContextService
        .create({
          apiType: 'admin',
        });

    const repo =
      this.connection.getRepository(
        ctx,
        OrderLicense,
      );

    const licenses =
      await repo.find({
        where: {
          expiresAt:
            Not(IsNull()),
        },
      });

    let reminders30 = 0;
    let reminders10 = 0;
    let reminders3 = 0;
    let expired = 0;

    const now =
      new Date();

    for (
      const license
      of licenses
    ) {

      if (!license.expiresAt) {
        continue;
      }

      /**
       * Une licence renouvelée
       * ne doit plus recevoir
       * les rappels de l'ancienne
       * échéance.
       */
      if (
        license.renewalStatus ===
        'RENEWED'
      ) {
        continue;
      }

      const daysRemaining =
        this.daysUntilExpiration(
          now,
          license.expiresAt,
        );

      /**
       * Expirée.
       */
      if (
        daysRemaining <= 0
      ) {

        if (
          license.renewalStatus !==
          'EXPIRED'
        ) {

          license.renewalStatus =
            'EXPIRED';

          await repo.save(
            license,
          );

          expired += 1;
        }

        continue;
      }


      /**
       * Dès J-30 on rend le
       * renouvellement disponible.
       */
      if (
        daysRemaining <= 30 &&
        license.renewalStatus ===
        'NONE'
      ) {

        license.renewalStatus =
          'AVAILABLE';

        await repo.save(
          license,
        );
      }


      /**
       * J-30
       */
      if (
        this.inReminderWindow(
          daysRemaining,
          30,
        ) &&
        !license
          .renewalReminder30SentAt
      ) {

        await this
          .sendAutomaticReminder(
            ctx,
            license,
            30,
            daysRemaining,
          );

        license
          .renewalReminder30SentAt =
          new Date();

        await repo.save(
          license,
        );

        reminders30 += 1;

        /**
         * Une seule campagne
         * par exécution/licence.
         */
        continue;
      }


      /**
       * J-10
       */
      if (
        this.inReminderWindow(
          daysRemaining,
          10,
        ) &&
        !license
          .renewalReminder10SentAt
      ) {

        await this
          .sendAutomaticReminder(
            ctx,
            license,
            10,
            daysRemaining,
          );

        license
          .renewalReminder10SentAt =
          new Date();

        await repo.save(
          license,
        );

        reminders10 += 1;

        continue;
      }


      /**
       * J-3
       */
      if (
        this.inReminderWindow(
          daysRemaining,
          3,
        ) &&
        !license
          .renewalReminder3SentAt
      ) {

        await this
          .sendAutomaticReminder(
            ctx,
            license,
            3,
            daysRemaining,
          );

        license
          .renewalReminder3SentAt =
          new Date();

        await repo.save(
          license,
        );

        reminders3 += 1;
      }
    }


    return {
      checked:
        licenses.length,

      reminders30,
      reminders10,
      reminders3,

      expired,
    };
  }


  /**
   * Envoi manuel depuis
   * le Dashboard.
   *
   * IMPORTANT :
   *
   * ne modifie jamais
   * renewalReminderXXSentAt.
   */
  async sendManualReminder(
    ctx: RequestContext,
    licenseId: string,
    reminderDays?:
      LicenseReminderDays,
  ): Promise<OrderLicense> {

    const license =
      await this.findLicense(
        ctx,
        licenseId,
      );

    if (!license.expiresAt) {
      throw new Error(
        "La licence n'a pas de date d'expiration",
      );
    }

    const daysRemaining =
      this.daysUntilExpiration(
        new Date(),
        license.expiresAt,
      );

    const selectedReminder =
      reminderDays ??
      this.closestReminderThreshold(
        daysRemaining,
      );

    await this.eventBus.publish(
      new LicenseRenewalReminderEvent(
        ctx,
        {
          licenseId:
            String(license.id),

          reminderDays:
            selectedReminder,

          daysRemaining,

          expiresAt:
            license.expiresAt,

          renewalProductVariantId:
            license
              .renewalProductVariantId,

          manual:
            true,
        },
      ),
    );

    return license;
  }


  /**
   * Reset manuel des rappels.
   *
   * Utile notamment pour
   * les tests depuis le Dashboard.
   */
  async resetReminderHistory(
    ctx: RequestContext,
    licenseId: string,
  ): Promise<OrderLicense> {

    const repo =
      this.connection.getRepository(
        ctx,
        OrderLicense,
      );

    const license =
      await this.findLicense(
        ctx,
        licenseId,
      );

    license.renewalReminder30SentAt =
      null;

    license.renewalReminder10SentAt =
      null;

    license.renewalReminder3SentAt =
      null;

    return repo.save(
      license,
    );
  }


  /**
   * Relie une ancienne licence
   * à sa nouvelle licence.
   */
  async markRenewed(
    ctx: RequestContext,
    oldLicenseId: string,
    newLicenseId: string,
  ): Promise<void> {

    const repo =
      this.connection.getRepository(
        ctx,
        OrderLicense,
      );

    const oldLicense =
      await repo.findOne({
        where: {
          id:
            oldLicenseId as any,
        },
      });

    const newLicense =
      await repo.findOne({
        where: {
          id:
            newLicenseId as any,
        },
      });

    if (
      !oldLicense ||
      !newLicense
    ) {
      throw new Error(
        'Ancienne ou nouvelle licence introuvable',
      );
    }

    oldLicense.renewalStatus =
      'RENEWED';

    oldLicense.renewedToLicenseId =
      String(
        newLicense.id,
      );

    newLicense.renewedFromLicenseId =
      String(
        oldLicense.id,
      );

    await repo.save([
      oldLicense,
      newLicense,
    ]);
  }


  /**
   * Publication de l'événement
   * automatique.
   */
  private async sendAutomaticReminder(
    ctx: RequestContext,
    license: OrderLicense,
    reminderDays:
      LicenseReminderDays,
    daysRemaining: number,
  ): Promise<void> {

    if (!license.expiresAt) {
      return;
    }

    await this.eventBus.publish(
      new LicenseRenewalReminderEvent(
        ctx,
        {
          licenseId:
            String(license.id),

          reminderDays,

          daysRemaining,

          expiresAt:
            license.expiresAt,

          renewalProductVariantId:
            license
              .renewalProductVariantId,

          manual:
            false,
        },
      ),
    );
  }


  /**
   * Charge une licence.
   */
  private async findLicense(
    ctx: RequestContext,
    licenseId: string,
  ): Promise<OrderLicense> {

    const license =
      await this.connection
        .getRepository(
          ctx,
          OrderLicense,
        )
        .findOne({
          where: {
            id:
              licenseId as any,
          },
        });

    if (!license) {
      throw new Error(
        `Licence ${licenseId} introuvable`,
      );
    }

    return license;
  }


  /**
   * J-30 accepte J30/J29.
   * J-10 accepte J10/J9.
   * J-3 accepte J3/J2.
   *
   * Exemple :
   *
   * Si une licence arrive pour
   * la première fois à J2,
   * seul le rappel J3 peut partir.
   *
   * J10 et J30 ne seront PAS
   * envoyés en retard.
   */
  private inReminderWindow(
    daysRemaining: number,
    threshold:
      LicenseReminderDays,
  ): boolean {

    return (
      daysRemaining <=
        threshold &&
      daysRemaining >=
        threshold - 1
    );
  }


  /**
   * Choix automatique pour
   * le bouton "Envoyer rappel".
   */
  private closestReminderThreshold(
    daysRemaining: number,
  ): LicenseReminderDays {

    if (
      daysRemaining <= 3
    ) {
      return 3;
    }

    if (
      daysRemaining <= 10
    ) {
      return 10;
    }

    return 30;
  }


  /**
   * Calcul en jours calendaires.
   *
   * On ignore volontairement
   * l'heure de la journée.
   */
  private daysUntilExpiration(
    now: Date,
    expiresAt: Date,
  ): number {

    const currentDay =
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      );

    const expirationDay =
      Date.UTC(
        expiresAt.getUTCFullYear(),
        expiresAt.getUTCMonth(),
        expiresAt.getUTCDate(),
      );

    return Math.ceil(
      (
        expirationDay -
        currentDay
      ) /
      (
        1000 *
        60 *
        60 *
        24
      ),
    );
  }


  /**
   * Ajout de mois sécurisé.
   *
   * Exemple :
   * 31 janvier + 1 mois
   * => dernier jour de février.
   */
  private addMonths(
    date: Date,
    months: number,
  ): Date {

    const result =
      new Date(
        date.getTime(),
      );

    const originalDay =
      result.getDate();

    result.setDate(1);

    result.setMonth(
      result.getMonth() +
      months,
    );

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
