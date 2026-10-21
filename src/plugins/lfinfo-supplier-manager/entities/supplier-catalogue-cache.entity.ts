import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';
/** Cache of pages explicitly retrieved from the supplier. It never claims to be a full catalogue. */
@Entity()
@Index(['supplier', 'supplierSku'], { unique: true })
export class SupplierCatalogueCache extends VendureEntity {
  constructor(input?: DeepPartial<SupplierCatalogueCache>) { super(input); }
  @Column({ type: 'varchar', length: 64 }) supplier: string;
  @Column({ type: 'varchar', length: 255 }) supplierSku: string;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ type: 'timestamptz' }) fetchedAt: Date;
}
