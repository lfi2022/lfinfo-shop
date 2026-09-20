import {
  defineDashboardExtension,
} from '@vendure/dashboard';

import {
  OrderLicensesBlock,
} from './components/order-licenses-block';

import {
  LicensesPage,
} from './components/licenses-page';


defineDashboardExtension({

  routes: [
    {
      path:
        '/licenses',

      loader:
        () => ({
          breadcrumb:
            'Licences',
        }),

      navMenuItem: {
        id:
          'lfinfo-licenses',

        title:
          'Licences',

        sectionId:
          'sales',
      },

      component:
        LicensesPage,
    },
  ],


  pageBlocks: [
    {
      id:
        'lfinfo-order-licenses',

      title:
        'Licences',

      location: {
        pageId:
          'order-detail',

        column:
          'main',

        position: {
          blockId:
            'order-table',

          order:
            'after',
        },
      },

      component:
        ({ context }) => {
          return (
            <OrderLicensesBlock
              orderId={
                String(
                  context.entity?.id ??
                  '',
                )
              }
            />
          );
        },
    },
  ],

});
