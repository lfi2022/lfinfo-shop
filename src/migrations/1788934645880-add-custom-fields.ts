import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCustomFields1788934645880 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "collection_translation" ADD "customFieldsShortdescription" text`, undefined);
        await queryRunner.query(`ALTER TABLE "collection_translation" ADD "customFieldsSeocontent" text`, undefined);
        await queryRunner.query(`ALTER TABLE "collection_translation" ADD "customFieldsMetatitle" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "collection_translation" ADD "customFieldsMetadescription" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsShortdescription" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsMetatitle" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsMetadescription" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsFeatures" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsBenefits" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsCompatibility" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsActivationinstructions" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsPrerequisites" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsLicenseinformation" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsSeokeywords" text`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsSeokeywords"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsLicenseinformation"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsPrerequisites"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsActivationinstructions"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsCompatibility"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsBenefits"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsFeatures"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsMetadescription"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsMetatitle"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsShortdescription"`, undefined);
        await queryRunner.query(`ALTER TABLE "collection_translation" DROP COLUMN "customFieldsMetadescription"`, undefined);
        await queryRunner.query(`ALTER TABLE "collection_translation" DROP COLUMN "customFieldsMetatitle"`, undefined);
        await queryRunner.query(`ALTER TABLE "collection_translation" DROP COLUMN "customFieldsSeocontent"`, undefined);
        await queryRunner.query(`ALTER TABLE "collection_translation" DROP COLUMN "customFieldsShortdescription"`, undefined);
   }

}
