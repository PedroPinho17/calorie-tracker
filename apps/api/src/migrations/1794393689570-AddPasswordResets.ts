import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResets1794393689570 implements MigrationInterface {
    name = 'AddPasswordResets1794393689570'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "password_resets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tokenHash" character varying NOT NULL,
                "userId" uuid NOT NULL,
                "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "usedAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4816377aa98211c1de34469e742" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_7f6aae0fcc807c9e7194ca5cc4" ON "password_resets" ("tokenHash")
        `);
        await queryRunner.query(`
            ALTER TABLE "password_resets"
            ADD CONSTRAINT "FK_d95569f623f28a0bf034a55099e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "password_resets" DROP CONSTRAINT "FK_d95569f623f28a0bf034a55099e"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_7f6aae0fcc807c9e7194ca5cc4"
        `);
        await queryRunner.query(`
            DROP TABLE "password_resets"
        `);
    }

}
