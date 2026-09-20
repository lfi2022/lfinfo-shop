import { DeepPartial, ID, ProductVariant, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, ManyToOne } from 'typeorm';

/** A sellable subscription period. One plan is attached to one Vendure variant. */
@Entity()
@Index(['code'], { unique: true })
@Index(['productVariantId'])
export class SubscriptionPlan extends VendureEntity {
  constructor(input?: DeepPartial<SubscriptionPlan>) { super(input); }

  @Column({ length: 64 }) code: string;
  @Column({ length: 255 }) name: string;
  @Column({ type: 'int' }) intervalMonths: number;
  @Column({ default: true }) active: boolean;
  @Column() productVariantId: ID;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  productVariant: ProductVariant;
}
