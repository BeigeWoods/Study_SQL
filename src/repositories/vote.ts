import { Pool, PoolConnection } from "mysql2/promise";

const errHandler = (e: any, title: string) => {
  e.name = "vote_" + title;
  throw e;
};

export const operations = (conn: PoolConnection) => ({
  createTable: conn
    .query(
      "CREATE TABLE IF NOT EXISTS vote\
      (id INT NOT NULL UNIQUE AUTO_INCREMENT PRIMARY KEY,\
      total INT NOT NULL DEFAULT 0 CHECK (total >= 0),\
      userId INT UNIQUE NOT NULL,\
      CONSTRAINT FOREIGN KEY (userId) REFERENCES people (id) ON DELETE CASCADE)"
    )
    .then(() => "success to create vote table")
    .catch((e) => errHandler(e, "createTable")),
  getByUserId: (userId: number) =>
    conn
      .query(`SELECT id FROM vote WHERE userId = ${userId}`)
      .then((result: any[]) => result[0][0] && (result[0][0].id as number))
      .catch((e) => errHandler(e, "getByUserId")),
  create: (userId: number) =>
    conn
      .query(`INSERT INTO vote(userId) VALUES (${userId})`)
      .then((result: any[]) => result[0].insertId as number)
      .catch((e) => errHandler(e, "create")),
  do: (userId: number) =>
    conn
      .query(`UPDATE vote SET total = total + 1 WHERE id = ${userId}`)
      .catch((e) => errHandler(e, "do")),
  undo: (userId: number) =>
    conn
      .query(`UPDATE vote SET total = total - 1 WHERE id = ${userId}`)
      .catch((e) => errHandler(e, "undo")),
  init: (voteId: number) =>
    conn
      .query(`UPDATE vote SET total = 0 WHERE id = ${voteId}`)
      .catch((e) => errHandler(e, "init")),
});

export default class Vote {
  constructor(private db: Pool) {
    this.db = db;
  }

  createTable = async () => {
    let conn: PoolConnection;
    try {
      conn = await this.db.getConnection();
      return await conn
        .execute(
          "CREATE TABLE IF NOT EXISTS vote\
        (id INT NOT NULL UNIQUE AUTO_INCREMENT PRIMARY KEY,\
        total INT NOT NULL DEFAULT 0 CHECK (total >= 0),\
        userId INT UNIQUE NOT NULL,\
        FOREIGN KEY (userId) REFERENCES person (id) ON DELETE CASCADE ON UPDATE CASCADE)"
        )
        .then(() => "success to create table");
    } catch (e: any) {
      e.name = "account_createTable";
      throw e;
    } finally {
      this.db.releaseConnection(conn!);
    }
  };

  dropTable = async () => {
    let conn: PoolConnection;
    try {
      conn = await this.db.getConnection();
      return await conn
        .execute("DROP TABLE vote")
        .then(() => "success to drop table");
    } catch (e: any) {
      e.name = "account_dropTable";
      throw e;
    } finally {
      this.db.releaseConnection(conn!);
    }
  };
}
