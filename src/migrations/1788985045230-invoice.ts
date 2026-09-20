import {MigrationInterface, QueryRunner} from "typeorm";

export class Invoice1788985045230 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "invoice_config" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "channelId" character varying NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "createCreditInvoices" boolean NOT NULL DEFAULT true, "templateString" text, "id" SERIAL NOT NULL, CONSTRAINT "PK_ba2e98bc0e2318579582e7675c6" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "invoice" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "channelId" character varying NOT NULL, "orderId" character varying NOT NULL, "invoiceNumber" integer NOT NULL, "storageReference" character varying NOT NULL, "isCreditInvoice" boolean NOT NULL DEFAULT false, "orderTotals" text, "accountingReference" text, "id" SERIAL NOT NULL, "isCreditInvoiceForId" integer, CONSTRAINT "UQ_98203068f9fa9c41bff6fafec54" UNIQUE ("channelId", "invoiceNumber"), CONSTRAINT "PK_15d25c200d9bcd8a33f698daf18" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_b7af33221010a0c9e19761060e" ON "invoice" ("channelId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_f494ce6746b91e9ec9562af485" ON "invoice" ("orderId") `, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_22bbc77ea0b6eb7c9e878935b31" FOREIGN KEY ("isCreditInvoiceForId") REFERENCES "invoice"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_22bbc77ea0b6eb7c9e878935b31"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_f494ce6746b91e9ec9562af485"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_b7af33221010a0c9e19761060e"`, undefined);
        await queryRunner.query(`DROP TABLE "invoice"`, undefined);
        await queryRunner.query(`DROP TABLE "invoice_config"`, undefined);
   }

}
