import {
  PluginCommonModule,
  VendurePlugin,
} from '@vendure/core';

import {
  DocumentCounter,
} from './entities/document-counter.entity';

import {
  DocumentNumberService,
} from './services/document-number.service';

@VendurePlugin({
  imports: [
    PluginCommonModule,
  ],

  entities: [
    DocumentCounter,
  ],

  providers: [
    DocumentNumberService,
  ],

  compatibility: '^3.7.0',
})
export class LfinfoNumberingPlugin {}
