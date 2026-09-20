import {
  RequestContext,
  VendureEvent,
} from '@vendure/core';

export type LicenseReminderDays =
  | 30
  | 10
  | 3;

export interface LicenseRenewalReminderPayload {
  licenseId: string;

  /**
   * Seuil du rappel envoyé.
   * Ex: 30 = rappel J-30.
   */
  reminderDays:
    LicenseReminderDays;

  /**
   * Nombre réel de jours restants
   * au moment de l'envoi.
   */
  daysRemaining: number;

  expiresAt: Date;

  renewalProductVariantId:
    string | null;

  /**
   * true = déclenché manuellement
   * depuis le Dashboard.
   *
   * Un rappel manuel ne modifie jamais
   * les champs reminderXXSentAt.
   */
  manual: boolean;
}

export class LicenseRenewalReminderEvent
  extends VendureEvent {

  constructor(
    public ctx: RequestContext,

    public payload:
      LicenseRenewalReminderPayload,
  ) {
    super();
  }
}
