import {
  ScheduledTask,
} from '@vendure/core';

import {
  LicenseRenewalService,
} from './license-renewal.service';

export const licenseRenewalTask =
  new ScheduledTask({

    id: 'lfinfo-license-renewals',

    description:
      'Vérifie les expirations et rappels de renouvellement des licences LFINFO',

    schedule:
      cron => cron.everyDayAt(8, 0),

    async execute({
      injector,
    }) {

      const service =
        injector.get(
          LicenseRenewalService,
        );

      return service.processRenewals();
    },
  });
