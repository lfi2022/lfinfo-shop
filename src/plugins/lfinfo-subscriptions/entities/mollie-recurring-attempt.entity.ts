import { DeepPartial, ID, Order, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
@Entity()
@Index(['molliePaymentId'], { unique: true })
export class MollieRecurringAttempt extends VendureEntity {
  constructor(input?: DeepPartial<MollieRecurringAttempt>) { super(input); }
  @Column() orderId: ID;
  @ManyToOne(() => Order, { onDelete: 'CASCADE' }) order: Order;
  @Column({ length: 64 }) molliePaymentId: string;
  @Column({ length: 64 }) mollieCustomerId: string;
  @Column({ type: 'varchar', length: 20, default: 'OPEN' }) status: 'OPEN' | 'PAID' | 'FAILED';
}
