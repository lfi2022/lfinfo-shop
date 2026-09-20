import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionRecurringConsent1789240000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_subscription" ADD "recurringConsentAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "customer_subscription" ADD "recurringConsentVersion" character varying(32)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_subscription" DROP COLUMN "recurringConsentVersion"`);
    await queryRunner.query(`ALTER TABLE "customer_subscription" DROP COLUMN "recurringConsentAt"`);
  }
}
