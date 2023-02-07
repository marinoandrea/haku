import * as haku from "@haku/core";
import * as sequelize from "sequelize";
import { z } from "zod";
import { PostgresEntityRepository } from ".";

let connection: sequelize.Sequelize;

const TodoSchema = haku.EntitySchema.extend({
  name: z.string(),
  description: z.string().optional().nullable(),
});

beforeAll(async () => {
  const DATABASE_USERNAME = process.env.TEST_POSTGRES_USER;
  const DATABASE_PASSWORD = process.env.TEST_POSTGRES_PASSWORD;
  const DATABASE_DBNAME = process.env.TEST_POSTGRES_DB;

  if (!DATABASE_USERNAME || !DATABASE_PASSWORD || !DATABASE_DBNAME)
    throw new Error(`Missing database configuration env variables.`);

  connection = new sequelize.Sequelize(
    DATABASE_DBNAME,
    DATABASE_USERNAME,
    DATABASE_PASSWORD,
    { dialect: "postgres", logging: false }
  );
});

test("Repository initialization", async () => {
  new PostgresEntityRepository(TodoSchema, {
    connection,
    table: "todo",
  });
});

test("Create entity", async () => {
  const name1 = "Test Todo 1";
  const desc1 = "This is a test todo.";

  const todoRepository = new PostgresEntityRepository(TodoSchema, {
    connection,
    table: "todo",
  });

  const todo1 = await todoRepository.create({
    name: name1,
    description: desc1,
  });

  expect(todo1).toMatchObject({
    id: todo1.id,
    createdAt: todo1.createdAt,
    updatedAt: todo1.updatedAt,
    name: name1,
    description: desc1,
  });

  const result = await todoRepository.get(todo1.id);
  expect(result).not.toBeNull();
});

test("Delete entity", async () => {
  const name1 = "Test Todo 1";
  const desc1 = "This is a test todo.";

  const todoRepository = new PostgresEntityRepository(TodoSchema, {
    connection,
    table: "todo",
  });

  const todo1 = await todoRepository.create({
    name: name1,
    description: desc1,
  });

  await todoRepository.delete(todo1.id);
  const result = await todoRepository.get(todo1.id);
  expect(result).toBeNull();
});

test("Update entity", async () => {
  const name1 = "Test Todo 1";
  const desc1Before = "This is a test todo.";
  const desc1After = "This is an updated test todo.";

  const todoRepository = new PostgresEntityRepository(TodoSchema, {
    connection,
    table: "todo",
  });

  let todo = await todoRepository.create({
    name: name1,
    description: desc1Before,
  });

  todo = (await todoRepository.get(todo.id))!;
  expect(todo).not.toBeNull();

  todo = await todoRepository.update(todo.id, { description: desc1After });
  expect(todo).toMatchObject({
    id: todo.id,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
    name: name1,
    description: desc1After,
  });
});

afterAll(() => connection.close());
