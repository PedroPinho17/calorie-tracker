import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Login: tabelas users + sessions e dono (userId) em meals, goals e food_aliases.
 * As colunas userId ficam nullable para não perder dados antigos: o 1.º utilizador
 * a registar-se fica com eles (ver AuthService.register).
 */

export class AddAuth1794392423482 implements MigrationInterface {
    name = 'AddAuth1794392423482'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tokenHash" character varying NOT NULL,
                "userId" uuid NOT NULL,
                "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_bace6c68efc156fddac9b14bda" ON "sessions" ("tokenHash")
        `);
        await queryRunner.query(`
            ALTER TABLE "food_aliases"
            ADD "userId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "meals"
            ADD "userId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "goals"
            ADD "userId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "food_aliases" DROP CONSTRAINT "UQ_e1426908692581b469c6ad27d8b"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_29a691bef4ce906a2eab6e3afe" ON "food_aliases" ("userId", "alias")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a09052bc4efeafd639069f7c47" ON "meals" ("userId", "date")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_57dd8a3fc26eb760d076bf8840" ON "goals" ("userId")
        `);
        await queryRunner.query(`
            ALTER TABLE "sessions"
            ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "food_aliases"
            ADD CONSTRAINT "FK_4326ae821904899794beeb2c256" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "meals"
            ADD CONSTRAINT "FK_3111c7cf13da976d7ed18287811" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "goals"
            ADD CONSTRAINT "FK_57dd8a3fc26eb760d076bf8840e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "goals" DROP CONSTRAINT "FK_57dd8a3fc26eb760d076bf8840e"
        `);
        await queryRunner.query(`
            ALTER TABLE "meals" DROP CONSTRAINT "FK_3111c7cf13da976d7ed18287811"
        `);
        await queryRunner.query(`
            ALTER TABLE "food_aliases" DROP CONSTRAINT "FK_4326ae821904899794beeb2c256"
        `);
        await queryRunner.query(`
            ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_57dd8a3fc26eb760d076bf8840"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a09052bc4efeafd639069f7c47"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_29a691bef4ce906a2eab6e3afe"
        `);
        await queryRunner.query(`
            ALTER TABLE "food_aliases"
            ADD CONSTRAINT "UQ_e1426908692581b469c6ad27d8b" UNIQUE ("alias")
        `);
        await queryRunner.query(`
            ALTER TABLE "goals" DROP COLUMN "userId"
        `);
        await queryRunner.query(`
            ALTER TABLE "meals" DROP COLUMN "userId"
        `);
        await queryRunner.query(`
            ALTER TABLE "food_aliases" DROP COLUMN "userId"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bace6c68efc156fddac9b14bda"
        `);
        await queryRunner.query(`
            DROP TABLE "sessions"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
    }

}
