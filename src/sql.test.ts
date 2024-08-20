import { pool } from "./connection";
import Repository from "./data";

describe("Connection and Disconnection", () => {
  afterAll(async () => {
    try {
      await pool.end().then(() => console.log("DB disconnected"));
    } catch (err) {
      console.error("Failed disconnection\n", err);
    }
  });

  test("return a result sorted out", async () => {
    const getUser = async () => {
      let conn;
      try {
        conn = await pool.getConnection();
        const [result]: any[] = await conn.query("SELECT * from temp");
        return result[0];
      } catch (error: any) {
        expect(error.message).toBe([]);
      } finally {
        pool.releaseConnection(conn!);
      }
    };
    const x = await getUser();

    expect(x).not.toBeUndefined();
  });

  test("return query statement", async () => {
    const getUser = async () => {
      let conn;
      try {
        conn = await pool.getConnection();
        return conn
          .execute("SELECT * FROM temp WHERE id = ?", ["id"])
          .then((result) => result[0]);
      } catch (error: any) {
        expect(error.message).toBe("Truncated incorrect INTEGER value: 'id'");
      } finally {
        pool.releaseConnection(conn!);
      }
    };
    const x = await getUser();

    expect(x).not.toBeUndefined();
  });
});

describe("Repository", () => {
  const repository = new Repository(pool);
  const errorCallback = jest.fn((err: any) => err);
  let id: number;

  beforeAll(async () => {
    await pool
      .getConnection()
      .then(() => console.log("DB connected"))
      .catch((error) => console.error("Failed Connection\n", error));
  });

  afterAll(async () => {
    try {
      await pool.end().then(() => console.log("DB disconnected"));
    } catch (err) {
      console.error("Failed disconnection\n", err);
    }
  });

  describe("create", () => {
    let sql = "INSERT INTO temp(name, age) VALUES (?, ?)";
    const info = ["smith", "123"];

    test("returns creadted data", async () => {
      try {
        await pool.execute(sql, info).then((result: any) => {
          expect(result).toHaveLength(2);
          // [
          //   ResultSetHeader {
          //     fieldCount: 0,
          //     affectedRows: 1,
          //     insertId: 1,
          //     info: '',
          //     serverStatus: 2,
          //     warningStatus: 0
          //   },
          //   undefined
          // ]
          id = result[0].insertId;
        });
      } catch (error: any) {
        expect(error.message).toBe([]);
        return errorCallback(error);
      }
      expect(errorCallback).not.toHaveBeenCalled();
    });

    test("returns error by duplicate data", async () => {
      // await pool
      //   .execute(sql, info)
      //   .then((result) => expect(result).toEqual([]))
      //   .catch((error: any) => {
      //     expect(error.message).toBe(
      //       "Duplicate entry 'smith' for key 'temp.name'"
      //     );
      //     return errorCallback(error);
      //   });
      // expect(errorCallback).toHaveBeenCalled();
      try {
        await pool
          .execute(sql, info)
          .then((result) => expect(result).toEqual([]));
      } catch (error: any) {
        expect(error.message).toBe(
          "Duplicate entry 'smith' for key 'temp.name'"
        );
        return errorCallback(error);
      }
      expect(pool).toHaveLastReturnedWith(errorCallback);
    });
  });

  describe("getById", () => {
    test("succeeds to get temp by id", async () => {
      await pool
        .execute("SELECT * FROM temp WHERE id = ?", [id])
        .then((result: any[]) => expect(typeof result[0][0]).toBe("object"))
        .catch((error) => expect(error.message).toBe([]));
    });

    test("returns undefined when gets temp by NaN", async () => {
      await pool
        .execute("SELECT * FROM temp WHERE id = ?", [NaN])
        .then((result: any[]) => expect(result[0][0]).toBeUndefined())
        .catch((error) => expect(error.message).toBe([]));
    });

    test("returns undefined when temp doesn't exist", async () => {
      await pool
        .execute("SELECT * FROM temp WHERE id = ?", [1])
        .then((result: any[]) => expect(result[0][0]).toBeUndefined())
        .catch((error) => expect(error.message).toBe([]));
    });

    test("returns error by wrong type of data", async () => {
      await pool
        .execute("SELECT * FROM temp WHERE id = ?", ["id"])
        .then((result: any[]) => expect(result[0][0]).toBeUndefined())
        .catch((error) =>
          expect(error.message).toBe("Truncated incorrect INTEGER value: 'id'")
        );
    });

    test("returns error by wrong query", async () => {
      await pool
        .execute("SELECT * FROM tempp")
        .then((result: any[]) => expect(result[0]).toBeUndefined())
        .catch((error) =>
          expect(error.message).toBe("Table 'test.tempp' doesn't exist")
        );
    });
  });

  describe("update", () => {
    test("returns error when null is provided", async () => {
      await pool
        .execute("UPDATE temp SET name = ? WHERE id = ?", [null, id])
        .catch((error) =>
          expect(error.message).toBe("Column 'name' cannot be null")
        );
    });

    test("returns '' when '' is provided", async () => {
      await pool.execute("UPDATE temp SET name = ? WHERE id = ?", ["", id]);

      await pool
        .execute("SELECT name FROM temp WHERE id = ?", [id])
        .then((result: any[]) => expect(result[0][0].name).toBe(""))
        .catch((error) => expect(error.message).toBe([]));
    });

    test("repository.update : returns 'mr.smith' when 'mr.smith' is provided", async () => {
      const info = ["mr.smith", 30];

      await repository
        .update(info)
        .catch((error) => expect(error?.message).toBe([]));

      await pool
        .execute("SELECT age FROM temp WHERE id = ?", [id])
        .then((result: any[]) => {
          expect(result[0][0]).toMatchObject({
            age: "30",
          });
        })
        .catch((error) => {
          expect(error).toBeUndefined();
        });
    });
  });

  describe("delete", () => {
    let sql = "DELETE FROM temp WHERE id = ?";

    test("returns error by wrong type of data", async () => {
      try {
        await pool.execute(sql, ["id"]);
      } catch (error: any) {
        expect(error.message).toBe("Truncated incorrect INTEGER value: 'id'");
        return errorCallback(error);
      }
      expect(pool).toHaveReturnedWith(errorCallback);
      expect(errorCallback).toHaveBeenCalled();
    });

    test("will success delete if value of id is NaN", async () => {
      try {
        await pool.execute(sql, [NaN]);
      } catch (error: any) {
        expect(error.message).toBe([]);
        return errorCallback(error);
      }
      expect(errorCallback).not.toHaveBeenCalled();
    });

    test("will success delete if value of id is null", async () => {
      await pool.execute(sql, [null]).catch((error: any) => {
        expect(error.message).toBe([]);
        return errorCallback(error);
      });
      expect(errorCallback).not.toHaveBeenCalled();
    });

    test("succeeds to delete temp by id", async () => {
      try {
        await pool.execute(sql, [id]);
      } catch (error: any) {
        expect(error.message).toBe([]);
        return errorCallback(error);
      }
      expect(errorCallback).not.toHaveBeenCalled();
    });
  });
});
