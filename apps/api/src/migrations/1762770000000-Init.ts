import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1762770000000 implements MigrationInterface {
    name = 'Init1762770000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "foods" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "source" character varying NOT NULL,
                "externalId" character varying,
                "kcalPer100g" double precision NOT NULL,
                "proteinPer100g" double precision NOT NULL,
                "carbsPer100g" double precision NOT NULL,
                "fatPer100g" double precision NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_0cc83421325632f61fa27a52b59" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_4599191ad3faf6552f04c276b9" ON "foods" ("source", "externalId")
        `);
        await queryRunner.query(`
            CREATE TABLE "food_aliases" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "alias" character varying NOT NULL,
                "timesUsed" integer NOT NULL DEFAULT '1',
                "foodId" uuid,
                CONSTRAINT "UQ_e1426908692581b469c6ad27d8b" UNIQUE ("alias"),
                CONSTRAINT "PK_0bd881cc7d23ebe6d241869835e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "meal_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "grams" double precision NOT NULL,
                "kcal" double precision NOT NULL,
                "protein" double precision NOT NULL,
                "carbs" double precision NOT NULL,
                "fat" double precision NOT NULL,
                "mealId" uuid,
                "foodId" uuid,
                CONSTRAINT "PK_1e2d1209132a6ae53837e349a60" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "meals" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "date" date NOT NULL,
                "type" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_e6f830ac9b463433b58ad6f1a59" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "food_aliases"
            ADD CONSTRAINT "FK_d24c0145e4a604675951f58b0fc" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "meal_items"
            ADD CONSTRAINT "FK_3f6ef111eb47f12e88760243aa6" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "meal_items"
            ADD CONSTRAINT "FK_0bdb7ee81ea1870cbc86d26986c" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "meal_items" DROP CONSTRAINT "FK_0bdb7ee81ea1870cbc86d26986c"
        `);
        await queryRunner.query(`
            ALTER TABLE "meal_items" DROP CONSTRAINT "FK_3f6ef111eb47f12e88760243aa6"
        `);
        await queryRunner.query(`
            ALTER TABLE "food_aliases" DROP CONSTRAINT "FK_d24c0145e4a604675951f58b0fc"
        `);
        await queryRunner.query(`
            DROP TABLE "meals"
        `);
        await queryRunner.query(`
            DROP TABLE "meal_items"
        `);
        await queryRunner.query(`
            DROP TABLE "food_aliases"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4599191ad3faf6552f04c276b9"
        `);
        await queryRunner.query(`
            DROP TABLE "foods"
        `);
    }

}
