import {
  Injectable,
} from '@nestjs/common';

import {
  RequestContext,
  TransactionalConnection,
} from '@vendure/core';

import {
  DocumentCounter,
} from '../entities/document-counter.entity';

@Injectable()
export class DocumentNumberService {

  constructor(
    private connection: TransactionalConnection,
  ) {}

  async nextOrderNumber(
    ctx: RequestContext,
  ): Promise<string> {

    const year =
      new Date().getFullYear();

    const yearShort =
      String(year).slice(-2);

    /**
     * PostgreSQL UPSERT atomique.
     *
     * Pas de SELECT MAX() + 1 :
     * celui-ci pourrait produire des doublons
     * avec plusieurs commandes simultanées.
     */
    const rows:
      Array<{ sequence: number }> =
      await this.connection.rawConnection.query(
        `
        INSERT INTO "document_counter"
          (
            "createdAt",
            "updatedAt",
            "documentType",
            "year",
            "sequence"
          )
        VALUES
          (
            NOW(),
            NOW(),
            $1,
            $2,
            1
          )

        ON CONFLICT
          ("documentType", "year")

        DO UPDATE SET
          "sequence" =
            "document_counter"."sequence" + 1,
          "updatedAt" = NOW()

        RETURNING "sequence"
        `,
        [
          'ORDER',
          year,
        ],
      );

    const sequence =
      Number(rows[0].sequence);

    return (
      `COM${yearShort}-` +
      String(sequence).padStart(3, '0')
    );
  }
}
