import {
  DeepPartial,
  VendureEntity,
} from '@vendure/core';

import {
  Column,
  Entity,
  Index,
} from 'typeorm';

@Entity()
@Index(['orderId'], { unique: true })
export class InvoiceEmailDelivery extends VendureEntity {

  constructor(input?: DeepPartial<InvoiceEmailDelivery>) {
    super(input);
  }

  @Column()
  orderId: string;

  @Column({
    type: 'timestamptz',
  })
  scheduledFor: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  sentAt: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  lastError: string | null;

  @Column({
    default: 0,
  })
  attempts: number;
}
