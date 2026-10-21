import { defineDashboardExtension } from '@vendure/dashboard';
import { SuppliersPage } from './components/suppliers-page';
defineDashboardExtension({ routes: [{ path: '/suppliers', loader: () => ({ breadcrumb: 'Fournisseurs' }), navMenuItem: { id: 'lfinfo-suppliers', title: 'Fournisseurs', sectionId: 'catalog' }, component: SuppliersPage }] });
