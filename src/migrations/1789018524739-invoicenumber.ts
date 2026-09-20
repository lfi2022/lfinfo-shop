import {MigrationInterface, QueryRunner} from "typeorm";

export class Invoicenumber1789018524739 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "document_counter" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "documentType" character varying NOT NULL, "year" integer NOT NULL, "sequence" integer NOT NULL DEFAULT '0', "id" SERIAL NOT NULL, CONSTRAINT "PK_58445d1198d2a87ab35cc1c97c9" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_17c2bb9a53e0dd1a2d0829e84f" ON "document_counter" ("documentType", "year") `, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_17c2bb9a53e0dd1a2d0829e84f"`, undefined);
        await queryRunner.query(`DROP TABLE "document_counter"`, undefined);
   }

}
