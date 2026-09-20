import {
  PluginCommonModule,
  VendurePlugin,
} from '@vendure/core';
import {
  RuntimeVendureConfig,
} from '@vendure/core';

import {
  LicenseRenewalService,
} from './renewals/license-renewal.service';

import {
  licenseRenewalTask,
} from './renewals/license-renewal.task';
import {
  adminApiExtensions,
} from './api/api-extensions';

import {
  OrderLicenseAdminResolver,
  OrderLicenseFieldResolver,
} from './api/order-license.resolver';

import {
  OrderLicense,
} from './entities/order-license.entity';

import {
  OrderLicenseService,
} from './services/order-license.service';
import {
  shopApiExtensions,
} from './api/shop-api-extensions';

import {
  OrderLicenseShopFieldResolver,
  OrderLicenseShopResolver,
} from './api/order-license-shop.resolver';

import {
  LicenseFulfillmentListener,
} from './events/license-fulfillment.listener';

@VendurePlugin({
  imports: [
    PluginCommonModule,
   
  ],
  dashboard: './dashboard/index.tsx',
  entities: [
    OrderLicense,
  ],

  providers: [
    OrderLicenseService,
     LicenseFulfillmentListener,
	LicenseRenewalService,
  ],
  shopApiExtensions: {
  schema: shopApiExtensions,
  resolvers: [
    OrderLicenseShopResolver,
    OrderLicenseShopFieldResolver,
  ],
},
  adminApiExtensions: {
    schema: adminApiExtensions,

    resolvers: [
      OrderLicenseAdminResolver,
      OrderLicenseFieldResolver,
    ],
  },

  compatibility: '^3.0.0',
  configuration: (
  config: RuntimeVendureConfig,
) => {

  if (!config.schedulerOptions) {
    throw new Error(
      '[LfinfoLicenses] schedulerOptions absent',
    );
  }

  config.schedulerOptions.tasks = [
    ...(config.schedulerOptions.tasks ?? []),
    licenseRenewalTask,
  ];

  return config;
},	
})
export class LfinfoLicensesPlugin {}

