import {MigrationInterface, QueryRunner} from "typeorm";

export class Invoicerenewal1789019843255 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order_license" ADD "activatedAt" TIMESTAMP WITH TIME ZONE`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "expiresAt" TIMESTAMP WITH TIME ZONE`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "durationMonths" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalStatus" character varying(32) NOT NULL DEFAULT 'NONE'`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewedFromLicenseId" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewedToLicenseId" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalProductVariantId" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalReminder30SentAt" TIMESTAMP WITH TIME ZONE`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalReminder15SentAt" TIMESTAMP WITH TIME ZONE`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalReminder7SentAt" TIMESTAMP WITH TIME ZONE`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalReminder1SentAt" TIMESTAMP WITH TIME ZONE`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalReminder1SentAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalReminder7SentAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalReminder15SentAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalReminder30SentAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalProductVariantId"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewedToLicenseId"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewedFromLicenseId"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalStatus"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "durationMonths"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "expiresAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "activatedAt"`, undefined);
   }

}
