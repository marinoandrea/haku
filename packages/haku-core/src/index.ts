import * as uuid from "uuid";
import { z } from "zod";

export const IdentifierSchema = z.string().uuid();

export type Identifier = z.infer<typeof IdentifierSchema>;

export const EntitySchema = z.object({
  id: IdentifierSchema.default(uuid.v4),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Entity = z.infer<typeof EntitySchema>;

export class EntityOperationError extends Error {}
export class EntityNotFoundError extends EntityOperationError {}
export class EntityAlreadyExistsError extends EntityOperationError {}

export abstract class EntityRepository<
  TEntitySchema extends typeof EntitySchema
> {
  public schema: TEntitySchema;

  constructor(schema: TEntitySchema) {
    this.schema = schema;
  }

  abstract get(id: Identifier): Promise<z.infer<TEntitySchema> | null>;
  abstract delete(id: Identifier): Promise<void>;

  public async create(
    data: Partial<
      Omit<z.infer<TEntitySchema>, "id" | "createdAt" | "updatedAt">
    >
  ): Promise<z.infer<TEntitySchema>> {
    const entity = this.schema.parse(data);
    await this._create(entity);
    return entity;
  }

  public async update(
    id: Identifier,
    data: Partial<Omit<z.infer<TEntitySchema>, "id" | "createdAt">>
  ): Promise<z.infer<TEntitySchema>> {
    const updated = await this._update(id, { ...data, updatedAt: new Date() });
    return this.schema.parse(updated);
  }

  abstract _create(e: z.infer<TEntitySchema>): Promise<void>;
  abstract _update(
    id: Identifier,
    e: Partial<Omit<z.infer<TEntitySchema>, "id" | "createdAt">>
  ): Promise<void>;
}
