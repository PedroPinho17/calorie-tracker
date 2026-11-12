import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Água (water_logs + goals.waterMl), peso (weight_logs) e pesquisa de alimentos:
 * - pg_trgm: semelhança por trigramas (aguenta erros de escrita: "bacalao" → "bacalhau")
 * - unaccent: "pao" encontra "pão"
 * - f_unaccent: versão IMMUTABLE do unaccent, para poder ser usada num índice
 */
export class NutritionTracking1794415438423 implements MigrationInterface {
    name = 'NutritionTracking1794415438423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
            LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
            AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_foods_name_trgm" ON "foods" USING gin (f_unaccent(lower("name")) gin_trgm_ops)
        `);
        await queryRunner.query(`
            CREATE TABLE "water_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "date" date NOT NULL,
                "ml" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7793241dc433ad0ac30ec9a906e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_cd21c25d1c565119c083b93424" ON "water_logs" ("userId", "date")
        `);
        await queryRunner.query(`
            CREATE TABLE "weight_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "date" date NOT NULL,
                "kg" double precision NOT NULL,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_96c8f4d341846b34fef50cf4576" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_43ded543dafcbf9015e58c9aec" ON "weight_logs" ("userId", "date")
        `);
        await queryRunner.query(`
            ALTER TABLE "goals"
            ADD "waterMl" integer NOT NULL DEFAULT '2000'
        `);
        await queryRunner.query(`
            ALTER TABLE "water_logs"
            ADD CONSTRAINT "FK_d81c9581256f120c96b365b405c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "weight_logs"
            ADD CONSTRAINT "FK_5d83c1656fef64dfbc54ab7ce37" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "weight_logs" DROP CONSTRAINT "FK_5d83c1656fef64dfbc54ab7ce37"
        `);
        await queryRunner.query(`
            ALTER TABLE "water_logs" DROP CONSTRAINT "FK_d81c9581256f120c96b365b405c"
        `);
        await queryRunner.query(`
            ALTER TABLE "goals" DROP COLUMN "waterMl"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_43ded543dafcbf9015e58c9aec"
        `);
        await queryRunner.query(`
            DROP TABLE "weight_logs"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_cd21c25d1c565119c083b93424"
        `);
        await queryRunner.query(`
            DROP TABLE "water_logs"
        `);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_foods_name_trgm"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS f_unaccent(text)`);
        // As extensões ficam: podem estar a ser usadas por outras coisas na BD.
    }

}
