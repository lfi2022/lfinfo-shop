import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCustomFields1788981408493 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "order_license" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orderId" integer NOT NULL, "orderLineId" integer NOT NULL, "productVariantId" integer NOT NULL, "licenseIndex" integer NOT NULL, "licenseKey" character varying(1024), "activationUrl" character varying(2048), "downloadUrl" character varying(2048), "instructions" text, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "deliveredAt" TIMESTAMP WITH TIME ZONE, "id" SERIAL NOT NULL, CONSTRAINT "PK_73ab26c2e0456e1e76d5449400f" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9d8cb488a50ce0cd8f38445b57" ON "order_license" ("orderLineId", "licenseIndex") `, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD CONSTRAINT "FK_b9198f0b7b4d4bd433e8ccc2f47" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD CONSTRAINT "FK_3b9d5253494e729d77ccf7f058b" FOREIGN KEY ("orderLineId") REFERENCES "order_line"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD CONSTRAINT "FK_d21249b7089378a30d0fd856f15" FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order_license" DROP CONSTRAINT "FK_d21249b7089378a30d0fd856f15"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP CONSTRAINT "FK_3b9d5253494e729d77ccf7f058b"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP CONSTRAINT "FK_b9198f0b7b4d4bd433e8ccc2f47"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_9d8cb488a50ce0cd8f38445b57"`, undefined);
        await queryRunner.query(`DROP TABLE "order_license"`, undefined);
   }

}
