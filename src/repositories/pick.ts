import { Pool, PoolConnection } from "mysql2/promise";

const errHandler = (e: any, title: string) => {
  e.name = "pick_" + title;
  throw e;
};

export const operations = (conn: PoolConnection) => ({
  createTable: conn
    .query(
      "CREATE TABLE IF NOT EXISTS pick\
      (userId INT NOT NULL,\
      voteId INT NOT NULL,\
      CONSTRAINT FOREIGN KEY (userId) REFERENCES people (id) ON DELETE CASCADE,\
      CONSTRAINT FOREIGN KEY (voteId) REFERENCES vote (id) ON DELETE CASCADE)"
    )
    .then(() => "success to create pick table")
    .catch((e) => errHandler(e, "createTable")),
  do: (userId: number, voteId: number) =>
    conn
      .query(`INSERT INTO pick(userId, voteId) VALUES(${userId}, ${voteId})`)
      .catch((e) => errHandler(e, "do")),
  undo: (voteId: number) =>
    conn
      .query(`DELETE FROM pick WHERE voteId = ${voteId}`)
      .catch((e) => errHandler(e, "undo")),
  findRelation: (userId: number, voteId: number) =>
    conn
      .query(
        `SELECT * FROM pick WHERE userId = ${userId} AND voteId = ${voteId}`
      )
      .then((result: any[]) => result[0][0])
      .catch((e) => errHandler(e, "findRelation")),
  truncate: conn
    .query("TRUNCATE TABLE pick")
    .catch((e) => errHandler(e, "truncate")),
});

export default class Pick {
  constructor(private db: Pool) {
    this.db = db;
  }

  dropTable = async () => {
    let conn: PoolConnection;
    try {
      conn = await this.db.getConnection();
      return await conn
        .query("DROP TABLE pick")
        .then(() => "success to drop table");
    } catch (e: any) {
      e.name = "deal_dropTable";
      throw e;
    } finally {
      this.db.releaseConnection(conn!);
    }
  };
}
