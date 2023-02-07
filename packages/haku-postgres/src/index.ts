import * as haku from "@haku/core";
import * as sequelize from "sequelize";
import { z } from "zod";

interface PostgresEntityRepositoryConfig {
  connection: sequelize.Sequelize;
  table: string;
}

function convertZodTypeToPostgres(field: unknown) {
  if (!(field instanceof z.ZodType)) throw new Error(`Field is not a ZodType.`);

  let fieldType = field;
  while (fieldType._def.innerType) fieldType = fieldType._def.innerType;
  const allowNull = field.isNullable() || field.isOptional();

  if (fieldType instanceof z.ZodBoolean)
    return { type: sequelize.DataTypes.BOOLEAN, allowNull } as const;
  if (fieldType instanceof z.ZodString)
    return { type: sequelize.DataTypes.TEXT, allowNull } as const;
  if (fieldType instanceof z.ZodDate)
    return { type: sequelize.DataTypes.DATE, allowNull } as const;
  if (fieldType instanceof z.ZodEnum || fieldType instanceof z.ZodNativeEnum)
    return { type: sequelize.DataTypes.TEXT, allowNull } as const;
  if (fieldType instanceof z.ZodNumber)
    return {
      type: fieldType.isInt
        ? sequelize.DataTypes.INTEGER
        : sequelize.DataTypes.DECIMAL,
      allowNull,
    } as const;

  throw new Error(
    `Field of type '${field._def.typeName}' cannot be converted to a Postgres type.`
  );
}

function isKey<T extends Object>(x: T, k: PropertyKey): k is keyof T {
  return k in x;
}

export class PostgresEntityRepository<
  TEntitySchema extends typeof haku.EntitySchema
> extends haku.EntityRepository<TEntitySchema> {
  private connection: sequelize.Sequelize;
  private table: string;
  private model: sequelize.ModelStatic<sequelize.Model>;
  private isInitialized: boolean;

  constructor(schema: TEntitySchema, config: PostgresEntityRepositoryConfig) {
    super(schema);
    this.connection = config.connection;
    this.table = config.table;
    this.model = this.buildModelFromSchema(schema);
    this.isInitialized = false;
  }

  private async init() {
    this.isInitialized = true;
    await this.model.sync({ alter: true });
  }

  private buildModelFromSchema(schema: TEntitySchema) {
    let attributes: any = {};
    for (let field in schema.shape) {
      if (!isKey(schema.shape, field)) continue;
      attributes[field] = convertZodTypeToPostgres(schema.shape[field]);
    }
    attributes.id.primaryKey = true;
    return this.connection.define(this.table, attributes, {
      tableName: this.table,
    });
  }

  async _update(
    id: haku.Identifier,
    data: Partial<Omit<z.infer<TEntitySchema>, "id" | "createdAt">>
  ): Promise<z.infer<TEntitySchema>> {
    if (!this.isInitialized) await this.init();
    const result = await this.model.findByPk(id);
    if (!result) throw new haku.EntityNotFoundError();
    const model = await result.update(data);
    return this.getSchema().parse(model);
  }

  async _create(e: z.TypeOf<TEntitySchema>): Promise<void> {
    await this.model.create(e, { returning: false });
  }

  public async get(
    id: haku.Identifier
  ): Promise<z.infer<TEntitySchema> | null> {
    if (!this.isInitialized) await this.init();
    const result = await this.model.findByPk(id);
    if (!result) return null;
    return this.getSchema().parse(result.toJSON());
  }

  async delete(id: haku.Identifier): Promise<void> {
    if (!this.isInitialized) await this.init();
    const result = await this.model.findByPk(id);
    if (!result) throw new haku.EntityNotFoundError();
    await result.destroy();
  }
}
