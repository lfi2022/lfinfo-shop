import { Customer, DeepPartial, ID, Order, OrderLine, ProductVariant, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';

export enum SubscriptionStatus { ACTIVE = 'ACTIVE', CANCELLED = 'CANCELLED', EXPIRED = 'EXPIRED' }

@Entity()
@Index(['orderLineId', 'subscriptionIndex'], { unique: true })
@Index(['customerId', 'status'])
export class CustomerSubscription extends VendureEntity {
  constructor(input?: DeepPartial<CustomerSubscription>) { super(input); }
  @Column() customerId: ID;
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' }) customer: Customer;
  @Column() orderId: ID;
  @ManyToOne(() => Order, { onDelete: 'CASCADE' }) order: Order;
  @Column() orderLineId: ID;
  @ManyToOne(() => OrderLine, { onDelete: 'CASCADE' }) orderLine: OrderLine;
  @Column({ type: 'int', default: 1 }) subscriptionIndex: number;
  @Column() planId: ID;
  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' }) plan: SubscriptionPlan;
  @Column() productVariantId: ID;
  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' }) productVariant: ProductVariant;
  @Column({ type: 'varchar', length: 20, default: SubscriptionStatus.ACTIVE }) status: SubscriptionStatus;
  @Column({ type: 'timestamptz' }) startedAt: Date;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) cancelledAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) reminder30SentAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) reminder10SentAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) reminder3SentAt: Date | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) mollieSubscriptionId: string | null;
}
