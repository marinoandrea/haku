import * as haku from "@haku/core";
import * as pg from "pg";
import { z } from "zod";

interface PostgresEntityRepositoryConfig {
  connection: pg.Client | pg.Pool;
  table: string;
}

export class PostgresEntityRepository<
  TEntitySchema extends typeof haku.EntitySchema
> extends haku.EntityRepository<TEntitySchema> {
  private connection: pg.Client | pg.Pool;
  private table: string;

  constructor(schema: TEntitySchema, config: PostgresEntityRepositoryConfig) {
    super(schema);
    this.connection = config.connection;
    this.table = config.table;
  }

  async _update(
    id: haku.Identifier,
    data: Partial<Omit<z.infer<TEntitySchema>, "id" | "createdAt">>
  ): Promise<void> {
    const result = await this.connection
      .collection(this.collection)
      .updateOne({ id }, data);
    if (result.matchedCount === 0) throw new haku.EntityNotFoundError();
  }

  async _create(e: z.TypeOf<TEntitySchema>): Promise<void> {
    await this.connection.collection(this.collection).insertOne(e);
  }

  public async get(
    id: haku.Identifier
  ): Promise<z.infer<TEntitySchema> | null> {
    const result = await this.connection
      .collection(this.collection)
      .findOne({ id });
    if (!result) return null;
    return super.schema.parse(result);
  }

  async delete(id: haku.Identifier): Promise<void> {
    const result = await this.connection
      .collection(this.collection)
      .deleteOne({ id });
    if (result.deletedCount === 0) throw new haku.EntityNotFoundError();
  }
}
