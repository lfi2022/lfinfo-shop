import { defineDashboardExtension } from '@vendure/dashboard';
import { SubscriptionPlansPage } from './subscription-plans-page';
defineDashboardExtension({ routes: [{ path: '/subscription-plans', loader: () => ({ breadcrumb: 'Abonnements' }), navMenuItem: { id: 'lfinfo-subscriptions', title: 'Abonnements', sectionId: 'sales' }, component: SubscriptionPlansPage }] });
