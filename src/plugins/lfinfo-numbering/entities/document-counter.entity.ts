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
@Index(
  ['documentType', 'year'],
  { unique: true },
)
export class DocumentCounter extends VendureEntity {

  constructor(
    input?: DeepPartial<DocumentCounter>,
  ) {
    super(input);
  }

  @Column()
  documentType: string;

  @Column()
  year: number;

  @Column({
    type: 'integer',
    default: 0,
  })
  sequence: number;
}
