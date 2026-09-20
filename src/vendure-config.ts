import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
} from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { LfinfoSeoPlugin } from './plugins/lfinfo-seo/lfinfo-seo.plugin';
import { MolliePlugin } from '@vendure-community/mollie-plugin';
import { EmailPlugin, defaultEmailHandlers } from '@vendure/email-plugin';
import {
  LfinfoInvoicesPlugin,
} from './plugins/lfinfo-invoices/lfinfo-invoices.plugin';
import {
  LfinfoNumberingPlugin,
} from './plugins/lfinfo-numbering/lfinfo-numbering.plugin';

import {
  LfinfoOrderCodeStrategy,
} from './plugins/lfinfo-numbering/strategies/lfinfo-order-code.strategy';
import {
  lfinfoInvoiceLoadDataFn,
} from './plugins/lfinfo-invoices/config/invoice-load-data';
import {
  licenseDeliveryHandler,
} from './plugins/lfinfo-licenses/email/license-delivery.handler';
import {
  invoiceEmailHandler,
} from './plugins/lfinfo-invoices/email/invoice-email.handler';
import {
  LfinfoLicensesPlugin,
} from './plugins/lfinfo-licenses/lfinfo-licenses.plugin';
import {
  licenseRenewalReminderHandler,
} from './plugins/lfinfo-licenses/email/license-renewal-reminder.handler';
import { LfinfoSubscriptionsPlugin } from './plugins/lfinfo-subscriptions/lfinfo-subscriptions.plugin';
import { subscriptionReminderHandler } from './plugins/lfinfo-subscriptions/email/subscription-reminder.handler';
import { subscriptionStartedHandler } from './plugins/lfinfo-subscriptions/email/subscription-started.handler';
import { mollieRecurringPaymentHandler } from './plugins/lfinfo-subscriptions/mollie-recurring.handler';

import {
  InvoicePlugin,
} from '@pinelab/pinelab-invoice-plugin';
const IS_DEV = process.env.APP_ENV === 'dev';
// PORT wins because hosting platforms inject it into the environment at runtime, and that
// must take precedence over any value baked into the .env file at scaffold time.
const serverPort = +process.env.PORT || +process.env.VENDURE_SERVER_PORT || 3000;

export const config: VendureConfig = {
	orderOptions: {
  orderCodeStrategy:
    new LfinfoOrderCodeStrategy(),
},    

apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // Which browser origins may make credentialed requests to the Shop and Admin APIs.
        // In dev any origin is reflected, so a storefront on any port works. In production set
        // CORS_ORIGINS to a comma-separated list of the origins you serve, for example
        // "https://example.com,https://admin.example.com". An unset value blocks all
        // cross-origin browser requests, which is the safe default.
        cors: {
            origin: IS_DEV ? true : (process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) ?? []),
            credentials: true,
        },
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie','api-key'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler, mollieRecurringPaymentHandler],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {},
    plugins: [
	LfinfoSeoPlugin,
	EmailPlugin.init({
handlers: [
    ...defaultEmailHandlers,
    licenseDeliveryHandler,
    invoiceEmailHandler,
     licenseRenewalReminderHandler,
    subscriptionReminderHandler,
    subscriptionStartedHandler,
  ],
  templatePath: path.join(__dirname, '../static/email/templates'),

  globalTemplateVars: {
    fromAddress: process.env.SMTP_FROM ?? 'LFINFO <shop@lfinfo.be>',
    verifyEmailAddressUrl: `${process.env.SHOP_URL}/verify-email`,
    passwordResetUrl: `${process.env.SHOP_URL}/reset-password`,
    changeEmailAddressUrl: `${process.env.SHOP_URL}/verify-email-change`,
  },

  transport: {
    type: 'smtp',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
	tls: {
    servername: process.env.SMTP_TLS_SERVERNAME ?? 'mail.lfinfo.be',
  },
    secure: process.env.SMTP_SECURE === 'true',
  },
}),
	MolliePlugin.init({
  vendureHost: 'https://adminshop.lfinfo.be',
}),
        GraphiqlPlugin.init(),
	LfinfoLicensesPlugin,
	LfinfoSubscriptionsPlugin,
	LfinfoInvoicesPlugin,
	LfinfoNumberingPlugin,
InvoicePlugin.init({
  vendureHost: 'https://adminshop.lfinfo.be',

  loadDataFn: lfinfoInvoiceLoadDataFn,
}),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // For local dev, the correct value for assetUrlPrefix should
            // be guessed correctly, but for production it will usually need
            // to be set manually to match your production url.
            assetUrlPrefix: IS_DEV ? undefined : 'https://adminshop.lfinfo.be/assets/',
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: IS_DEV
                ? path.join(__dirname, '../dist/dashboard')
                : path.join(__dirname, 'dashboard'),
        }),
    ],
};
