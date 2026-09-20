import {
  DeepPartial,
  ID,
  Order,
  OrderLine,
  ProductVariant,
  VendureEntity,
} from '@vendure/core';

import {
  Column,
  Entity,
  Index,
  ManyToOne,
} from 'typeorm';

export enum OrderLicenseStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
}

@Entity()
@Index(['orderLineId', 'licenseIndex'], { unique: true })
export class OrderLicense extends VendureEntity {

  constructor(input?: DeepPartial<OrderLicense>) {
    super(input);
  }

  @ManyToOne(() => Order, {
    onDelete: 'CASCADE',
  })
  order: Order;

  @Column()
  orderId: ID;

  @ManyToOne(() => OrderLine, {
    onDelete: 'CASCADE',
  })
  orderLine: OrderLine;

  @Column()
  orderLineId: ID;

  @ManyToOne(() => ProductVariant, {
    onDelete: 'RESTRICT',
  })
  productVariant: ProductVariant;

  @Column()
  productVariantId: ID;

  /**
   * Exemple :
   * quantité 3 =>
   * 1, 2, 3
   */
  @Column({ type: 'int' })
  licenseIndex: number;

  @Column({
    type: 'varchar',
    length: 1024,
    nullable: true,
  })
  licenseKey: string | null;

  @Column({
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  activationUrl: string | null;

  @Column({
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  downloadUrl: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  instructions: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderLicenseStatus.PENDING,
  })
  status: OrderLicenseStatus;
  @Column({
  type: 'timestamptz',
  nullable: true,
})
activatedAt: Date | null;

@Column({
  type: 'timestamptz',
  nullable: true,
})
expiresAt: Date | null;

@Column({
  type: 'integer',
  nullable: true,
})
durationMonths: number | null;

@Column({
  type: 'varchar',
  length: 32,
  default: 'NONE',
})
renewalStatus:
  | 'NONE'
  | 'AVAILABLE'
  | 'PENDING'
  | 'RENEWED'
  | 'EXPIRED';

@Column({
  type: 'varchar',
  nullable: true,
})
renewedFromLicenseId: string | null;

@Column({
  type: 'varchar',
  nullable: true,
})
renewedToLicenseId: string | null;

@Column({
  type: 'varchar',
  nullable: true,
})
renewalProductVariantId: string | null;

@Column({
  type: 'timestamptz',
  nullable: true,
})
renewalReminder30SentAt: Date | null;

@Column({
  type: 'timestamptz',
  nullable: true,
})
renewalReminder10SentAt: Date | null;

@Column({
  type: 'timestamptz',
  nullable: true,
})
renewalReminder3SentAt: Date | null;


  @Column({
  type: 'timestamptz',
  nullable: true,
})
deliveredAt: Date | null;
}
