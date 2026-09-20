import {MigrationInterface, QueryRunner} from "typeorm";

export class Invinvoicemail1788985964317 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "invoice_email_delivery" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orderId" character varying NOT NULL, "scheduledFor" TIMESTAMP WITH TIME ZONE NOT NULL, "sentAt" TIMESTAMP WITH TIME ZONE, "lastError" text, "attempts" integer NOT NULL DEFAULT '0', "id" SERIAL NOT NULL, CONSTRAINT "PK_3960d2829f3adab7cc93186a45a" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b3ebc0789d011c99fc2f871d9e" ON "invoice_email_delivery" ("orderId") `, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_b3ebc0789d011c99fc2f871d9e"`, undefined);
        await queryRunner.query(`DROP TABLE "invoice_email_delivery"`, undefined);
   }

}
