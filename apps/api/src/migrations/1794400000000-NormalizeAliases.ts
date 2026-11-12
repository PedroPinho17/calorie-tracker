import { MigrationInterface, QueryRunner } from 'typeorm';

/** Reescreve os aliases antigos no novo formato (singular + palavras ordenadas). */
export class NormalizeAliases1794400000000 implements MigrationInterface {
  name = 'NormalizeAliases1794400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      UPDATE food_aliases SET alias = (
        SELECT string_agg(w, ' ' ORDER BY w) FROM (
          SELECT CASE WHEN length(w) > 3 AND w LIKE '%s' AND w NOT LIKE '%ss' THEN left(w, -1) ELSE w END AS w
          FROM unnest(regexp_split_to_array(trim(regexp_replace(lower(alias), '[^a-z0-9]+', ' ', 'g')), ' ')) AS w
          WHERE w <> ''
        ) t
      )
    `);
  }

  public async down(): Promise<void> {
    // Não dá para voltar ao formato antigo; os aliases continuam a funcionar.
  }
}