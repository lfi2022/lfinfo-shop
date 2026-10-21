import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';
@Entity()
export class SupplierSyncLog extends VendureEntity {
  constructor(input?: DeepPartial<SupplierSyncLog>) { super(input); }
  @Column({ length: 32 }) level: 'INFO' | 'ERROR';
  @Column({ length: 128 }) action: string;
  @Column({ type: 'text' }) message: string;
}
