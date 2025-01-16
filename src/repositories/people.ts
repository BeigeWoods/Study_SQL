import { Pool, PoolConnection } from "mysql2/promise";

const errHandler = (e: any, title: string) => {
  e.name = "people_" + title;
  throw e;
};

const queries = {
  createTable:
    "CREATE TABLE IF NOT EXISTS people\
    (id INT NOT NULL UNIQUE AUTO_INCREMENT PRIMARY KEY,\
    name VARCHAR(45) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,\
    age INT NOT NULL DEFAULT 0 CHECK (age >= 0))",
  create: "INSERT INTO people(name, age) VALUES (?, ?)",
  update: (isAge: boolean) =>
    `UPDATE people SET ${isAge ? "age" : "name"} = ? WHERE id = ?`,
  getById: (isAge: boolean) =>
    `SELECT ${isAge ? "age" : "name"} FROM people WHERE id = ?`,
};

export const operations = (conn: PoolConnection) => ({
  createTable: conn
    .query(queries.createTable)
    .then(() => "success to create table")
    .catch((e) => errHandler(e, "createTable")),
  getByName: (name: string) =>
    conn
      .execute("SELECT id FROM people WHERE name = ?", [name])
      .then((result: any[]) => result[0][0] && (result[0][0].id as number))
      .catch((e) => errHandler(e, "getByName")),
  create: (name: string) =>
    conn
      .execute(queries.create, [name, 5])
      .then((result: any[]) => result[0].insertId as number)
      .catch((e) => errHandler(e, "create")),
  delete: (id: number) =>
    conn
      .query(`DELETE FROM people WHERE id = ${id}`)
      .catch((e) => errHandler(e, "delete")),
});

export default class People {
  constructor(private db: Pool) {
    this.db = db;
  }

  createTable = async () => {
    let conn: PoolConnection;
    try {
      conn = await this.db.getConnection();
      return await conn
        .query(queries.createTable)
        .then(() => "success to create table");
    } catch (e: any) {
      errHandler(e, "createTable");
    } finally {
      this.db.releaseConnection(conn!);
    }
  };

  truncateTable = async () => {
    let conn: PoolConnection;
    try {
      conn = await this.db.getConnection();
      return await conn
        .execute("TRUNCATE TABLE people")
        .then(() => "success to truncate table");
    } catch (e: any) {
      errHandler(e, "truncateTable");
    } finally {
      this.db.releaseConnection(conn!);
    }
  };

  getById = async (id: any) => {
    let conn: PoolConnection;
    try {
      conn = await this.db.getConnection();
      return await conn
        .execute("SELECT * FROM people WHERE id = ?", [id])
        .then((result: any[]) => result[0][0]);
    } catch (e: any) {
      errHandler(e, "getById");
    } finally {
      this.db.releaseConnection(conn!);
    }
  };

  create = async (info: (string | number)[]) => {
    let conn: PoolConnection;
    try {
      conn = await this.db.getConnection();
      return await conn
        .execute(queries.create, info)
        .then((result: any[]) => result[0].insertId as number);
    } catch (e: any) {
      errHandler(e, "create");
    } finally {
      this.db.releaseConnection(conn!);
    }
  };

  updateAge = async (id: number, age: any) => {
    let conn: PoolConnection;
    try {
      conn = await this.db.getConnection();
      await conn.execute(queries.update(true), [age, id]);
      return await conn
        .execute(queries.getById(true), [id])
        .then((result: any[]) => result[0][0] && (result[0][0].age as number));
    } catch (e: any) {
      errHandler(e, "updateAge");
    } finally {
      this.db.releaseConnection(conn!);
    }
  };

  updateName = async (id: number, name: any) => {
    let conn: PoolConnection;
    try {
      conn = await this.db.getConnection();
      await conn.execute(queries.update(false), [name, id]);
      return await conn
        .execute(queries.getById(false), [id])
        .then((result: any[]) => result[0][0] && (result[0][0].name as string));
    } catch (e: any) {
      errHandler(e, "updateName");
    } finally {
      this.db.releaseConnection(conn!);
    }
  };
}
