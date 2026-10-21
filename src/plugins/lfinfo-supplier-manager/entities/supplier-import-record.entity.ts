import { DeepPartial, ID, ProductVariant, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, ManyToOne } from 'typeorm';

/** Persistent supplier identity. The unique supplier SKU makes imports idempotent. */
@Entity()
@Index(['supplier', 'supplierSku'], { unique: true })
export class SupplierImportRecord extends VendureEntity {
  constructor(input?: DeepPartial<SupplierImportRecord>) { super(input); }
  @Column({ length: 64 }) supplier: string;
  @Column({ length: 255 }) supplierSku: string;
  @Column({ type: 'varchar', nullable: true, length: 255 }) manufacturerReference: string | null;
  @Column({ type: 'varchar', nullable: true, length: 64 }) ean: string | null;
  @Column({ type: 'int', nullable: true }) productVariantId: ID | null;
  @ManyToOne(() => ProductVariant, { nullable: true, onDelete: 'SET NULL' }) productVariant: ProductVariant | null;
  @Column({ type: 'integer', nullable: true }) lastPurchasePrice: number | null;
  @Column({ type: 'integer', nullable: true }) lastStock: number | null;
  @Column({ type: 'integer', default: 0 }) marginPercent: number;
  @Column({ type: 'integer', default: 0 }) fixedAmount: number;
  @Column({ type: 'timestamptz', nullable: true }) lastSyncedAt: Date | null;
  @Column({ type: 'text', nullable: true }) lastError: string | null;
}
