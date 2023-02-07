import * as haku from "@haku/core";
import mongodb from "mongodb";
import { z } from "zod";

interface MongoDBEntityRepositoryConfig {
  connection: mongodb.Db;
  collection: string;
}

export class MongoDBEntityRepository<
  TEntitySchema extends typeof haku.EntitySchema
> extends haku.EntityRepository<TEntitySchema> {
  private connection: mongodb.Db;
  private collection: string;

  constructor(schema: TEntitySchema, config: MongoDBEntityRepositoryConfig) {
    super(schema);
    this.connection = config.connection;
    this.collection = config.collection;
  }

  async _update(
    id: haku.Identifier,
    data: Partial<Omit<z.infer<TEntitySchema>, "id" | "createdAt">>
  ): Promise<z.infer<TEntitySchema>> {
    const result = await this.connection
      .collection(this.collection)
      .findOneAndUpdate({ id }, data);
    if (!result.ok) throw new haku.EntityNotFoundError();
    return this.getSchema().parse(result);
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
