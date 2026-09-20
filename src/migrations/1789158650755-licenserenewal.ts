import {MigrationInterface, QueryRunner} from "typeorm";

export class Licenserenewal1789158650755 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalReminder15SentAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalReminder7SentAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalReminder1SentAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalReminder10SentAt" TIMESTAMP WITH TIME ZONE`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalReminder3SentAt" TIMESTAMP WITH TIME ZONE`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalReminder3SentAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" DROP COLUMN "renewalReminder10SentAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalReminder1SentAt" TIMESTAMP WITH TIME ZONE`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalReminder7SentAt" TIMESTAMP WITH TIME ZONE`, undefined);
        await queryRunner.query(`ALTER TABLE "order_license" ADD "renewalReminder15SentAt" TIMESTAMP WITH TIME ZONE`, undefined);
   }

}
