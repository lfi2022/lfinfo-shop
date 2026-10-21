import { MigrationInterface, QueryRunner } from 'typeorm';
/** Preserve unknown supplier values as NULL; zero means TD SYNNEX explicitly returned zero. */
export class SupplierNullableValues1789300000001 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> { await q.query(`ALTER TABLE "supplier_import_record" ALTER COLUMN "lastPurchasePrice" DROP NOT NULL`); await q.query(`ALTER TABLE "supplier_import_record" ALTER COLUMN "lastStock" DROP NOT NULL`); }
  async down(q: QueryRunner): Promise<void> { await q.query(`UPDATE "supplier_import_record" SET "lastPurchasePrice" = 0 WHERE "lastPurchasePrice" IS NULL`); await q.query(`UPDATE "supplier_import_record" SET "lastStock" = 0 WHERE "lastStock" IS NULL`); await q.query(`ALTER TABLE "supplier_import_record" ALTER COLUMN "lastPurchasePrice" SET NOT NULL`); await q.query(`ALTER TABLE "supplier_import_record" ALTER COLUMN "lastStock" SET NOT NULL`); }
}
