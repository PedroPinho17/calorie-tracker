import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoals1794387788896 implements MigrationInterface {
    name = 'AddGoals1794387788896'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "goals" (
                "id" SERIAL NOT NULL,
                "kcal" integer NOT NULL DEFAULT '2000',
                "protein" integer NOT NULL DEFAULT '120',
                "carbs" integer NOT NULL DEFAULT '220',
                "fat" integer NOT NULL DEFAULT '65',
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_26e17b251afab35580dff769223" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "goals"
        `);
    }

}
