import { PoolConnection } from "mysql2/promise";
import pool from "../connection";
import { operations as user } from "../repositories/people";
import { operations as vote } from "../repositories/vote";
import { operations as picker } from "../repositories/pick";

describe("Controll concerrancy about good", () => {
  let AUserId: number | undefined,
    AVoteId: number | undefined,
    BUserId: number | undefined;

  beforeAll(async () => {
    let connA: PoolConnection, connB: PoolConnection;
    try {
      connA = await pool.getConnection();
      await user(connA).createTable;
      await vote(connA).createTable;
      await picker(connA).createTable;
    } catch (e) {
      console.error(e);
    } finally {
      connA!.release();
    }

    try {
      connB = await pool.getConnection();
      AUserId =
        (await user(connB).getByName("A")) || (await user(connB).create("A"));
      BUserId =
        (await user(connB).getByName("B")) || (await user(connB).create("B"));
      AVoteId =
        (await vote(connB).getByUserId(AUserId!)) ||
        (await vote(connB).create(AUserId!));
    } catch (e) {
      console.error(e);
    } finally {
      connB!.release();
      console.log(`AUserId : ${AUserId}, BUserId : ${BUserId}`);
    }
  });

  afterAll(async () => {
    /*
    AVoteId를 보유한 AUser는 마지막에 삭제되어야 한다.
    데이터 삭제에 promise all을 사용하지 않는 이유기도 하다.
    그렇지 않을 경우 reference 에러가 발생한다.
    Error > userRepository.delete: Cannot delete or update a parent row: a foreign key constraint fails (`dwitter`.`replies`, CONSTRAINT `reply_username` FOREIGN KEY (`username`) REFERENCES `users` (`username`) ON UPDATE CASCADE)
        at PromisePoolConnection.execute (/Users/leejuhyun/projects/Dwitter-MySQL/server/node_modules/mysql2/promise.js:112:22)
        at UserRepository.<anonymous> (/Users/leejuhyun/projects/Dwitter-MySQL/server/src/data/user.ts:141:18)
        at Generator.next (<anonymous>)
        at fulfilled (/Users/leejuhyun/projects/Dwitter-MySQL/server/src/data/user.ts:5:58)
        at processTicksAndRejections (node:internal/process/task_queues:95:5) {
      code: 'ER_ROW_IS_REFERENCED_2',
      errno: 1451,
      sql: 'DELETE FROM users WHERE id = ?',
      sqlState: '23000',
      sqlMessage: 'Cannot delete or update a parent row: a foreign key constraint fails (`dwitter`.`replies`, CONSTRAINT `reply_username` FOREIGN KEY (`username`) REFERENCES `users` (`username`) ON UPDATE CASCADE)'
    }
    */
    let conn: PoolConnection;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      await user(conn).delete(BUserId!);
      await user(conn).delete(AUserId!);

      await conn.commit();
    } catch (e) {
      await conn!.rollback();
      console.error("Fail to delete users\n", e);
    } finally {
      conn!.release();
    }

    await pool
      .end()
      .then(() => console.log("DB disconnected"))
      .catch((e) => console.error("Fail to disconnect\n", e));
  }, 30000);

  describe("fail", () => {
    test("lock wait timeout", async () => {
      /* 
    1. jest에서 test의 timeout을 설정 가능
    2. connection의 threadId 확인하기
    3. 트랜잭션 lock wait timeout
      - 설정 값 확인하기 : SELECT @@innodb_lock_wait_timeout;
      - 값 설정하기 : SET [GLOBAL/SESSION] innodb_lock_wait_timeout = ?; 설정하기
    */
      let connA: PoolConnection, connB: PoolConnection;
      try {
        connA = await pool.getConnection();
        connB = await pool.getConnection();
        console.log(
          `A threadId : ${connA.threadId}, B threadId : ${connB.threadId}`
        );

        await Promise.all([
          connA.query("SET SESSION innodb_lock_wait_timeout = 5"),
          connB.query("SET SESSION innodb_lock_wait_timeout = 5"),
        ]);

        await Promise.all([
          connA
            .beginTransaction()
            .then(() => console.log("start A transaction")),
          connB
            .beginTransaction()
            .then(() => console.log("start B transaction")),
        ]);

        await vote(connA)
          .do(AVoteId!)
          .catch((e) => {
            e.name = "A_AUser + 1";
            throw e;
          });
        await vote(connB)
          .do(AVoteId!)
          .catch((e) => {
            e.name = "B_BUser + 1";
            throw e;
          });

        await picker(connA)
          .do(AUserId!, AVoteId!)
          .catch((e) => {
            e.name = "A_AUser's pick";
            throw e;
          });
        await picker(connB)
          .do(BUserId!, AVoteId!)
          .catch((e) => {
            e.name = "B_BUser's pick";
            throw e;
          });

        await Promise.all([
          connA!.commit().then(() => console.log("done A transaction")),
          connB!.commit().then(() => console.log("done B transaction")),
        ]);
      } catch (e: any) {
        expect(e.name).toBe("B_BUser + 1");
        expect(e.message).toBe(
          "Lock wait timeout exceeded; try restarting transaction"
        );
        await Promise.all([connA!.rollback(), connB!.rollback()]).catch((e) =>
          console.error(e)
        );
      } finally {
        connA!.release();
        connB!.release();
      }
    }, 20000);
  });

  describe("success", () => {
    afterEach(async () => {
      let conn: PoolConnection;
      try {
        conn = await pool.getConnection();
        await Promise.all([picker(conn).truncate, vote(conn).init(AVoteId!)]);
      } catch (e) {
        console.error(e);
      } finally {
        console.log("success to initialize");
        conn!.release();
      }
    });

    test("vote -> pick", async () => {
      let connC: PoolConnection, connD: PoolConnection;
      try {
        connC = await pool.getConnection();
        connD = await pool.getConnection();
        console.log(
          `C threadId : ${connC.threadId}, D threadId : ${connD.threadId}`
        );

        await Promise.all([
          connC.query("SET SESSION innodb_lock_wait_timeout = 5"),
          connD.query("SET SESSION innodb_lock_wait_timeout = 5"),
        ]);

        await Promise.all([connC.beginTransaction(), connD.beginTransaction()]);

        await Promise.race([
          vote(connC)
            .do(AVoteId!)
            .catch((e) => {
              e.name = "C_AUser + 1";
              throw e;
            }),
          vote(connD)
            .do(AVoteId!)
            .catch((e) => {
              e.name = "D_BUser + 1";
              throw e;
            }),
        ]);

        await Promise.all([
          picker(connC)
            .do(AUserId!, AVoteId!)
            .then(() =>
              connC!.commit().then(() => console.log("done C transaction"))
            )
            .catch((e) => {
              e.name = "C_AUser's pick";
              throw e;
            }),
          picker(connD)
            .do(BUserId!, AVoteId!)
            .then(() =>
              connD!.commit().then(() => console.log("done D transaction"))
            )
            .catch((e) => {
              e.name = "D_User's pick";
              throw e;
            }),
        ]);
      } catch (e: any) {
        e && console.error(e);
        await Promise.all([connC!.rollback(), connD!.rollback()]).catch((e) =>
          console.error(e)
        );
      } finally {
        connC!.release();
        connD!.release();
      }

      let conn: PoolConnection;
      try {
        conn = await pool.getConnection();
        await Promise.all([
          conn
            .query(`SELECT total FROM vote WHERE id = ${AVoteId}`)
            .then((result: any[]) => expect(result[0][0].total).toBe(2)),
          conn
            .query(`SELECT * FROM pick WHERE voteId = ${AVoteId}`)
            .then((result: any[]) => expect(result[0].length).toBe(2)),
        ]);
      } catch (e) {
        console.error(e);
      } finally {
        conn!.release();
      }
    }, 20000);

    test("pick -> race", async () => {
      let connE: PoolConnection, connF: PoolConnection;
      try {
        connE = await pool.getConnection();
        connF = await pool.getConnection();
        console.log(
          `E threadId : ${connE.threadId}, F threadId : ${connF.threadId}`
        );

        await Promise.all([
          connE.query("SET SESSION innodb_lock_wait_timeout = 5"),
          connF.query("SET SESSION innodb_lock_wait_timeout = 5"),
        ]);

        await Promise.all([connE.beginTransaction(), connF.beginTransaction()]);

        await Promise.all([
          picker(connE)
            .do(AUserId!, AVoteId!)
            .catch((e) => {
              e.name = "E_AUser's pick";
              throw e;
            }),
          picker(connF)
            .do(BUserId!, AVoteId!)
            .catch((e) => {
              e.name = "F_BUser's pick";
              throw e;
            }),
        ]);

        await Promise.all([
          vote(connF)
            .do(AVoteId!)
            .then(
              async () =>
                await connF!
                  .commit()
                  .then(() => console.log("done F transaction"))
            )
            .catch((e) => {
              e.name = "F_BUser + 1";
              throw e;
            }),
          vote(connE)
            .do(AVoteId!)
            .then(
              async () =>
                await connE!
                  .commit()
                  .then(() => console.log("done E transaction"))
            )
            .catch((e) => {
              e.name = "E_AUser + 1";
              throw e;
            }),
        ]);
      } catch (e: any) {
        e && console.error(e);
        await Promise.all([connE!.rollback(), connF!.rollback()]).catch((e) =>
          console.error(e)
        );
      } finally {
        connE!.release();
        connF!.release();
      }

      let conn: PoolConnection;
      try {
        conn = await pool.getConnection();
        await Promise.all([
          conn
            .query(`SELECT total FROM vote WHERE id = ${AVoteId}`)
            .then((result: any[]) => expect(result[0][0].total).toBe(2)),
          conn
            .query(`SELECT * FROM pick WHERE voteId = ${AVoteId}`)
            .then((result: any[]) => expect(result[0].length).toBe(2)),
        ]);
      } catch (e) {
        console.error(e);
      } finally {
        conn!.release();
      }
    }, 20000);
  });
});
