import pool from "../connection";
import People from "../repositories/people";

describe("People Repository", () => {
  const people = new People(pool);
  let id: number;

  beforeAll(async () => {
    await people
      .createTable()
      .then((x) => console.log(x))
      .catch((e) => console.error(e));
  });

  afterAll(async () => {
    await people
      .truncateTable()
      .then((x) => console.log(x))
      .catch((e) => console.error(e));
    await pool
      .end()
      .then(() => console.log("DB disconnected"))
      .catch((e) => console.error("Failed disconnection\n", e));
  });

  describe("create", () => {
    const info = ["smith", 9];

    test("success to create", async () =>
      await people
        .create(info)
        .then((result) => {
          id = result!;
          expect(typeof result).toBe("number");
        })
        .catch((e) => expect(e.message).toBe([])));

    test("returns error by duplicate data", async () =>
      await people
        .create(info)
        .then((result) => expect(result).toEqual([]))
        .catch((e) =>
          expect(e.message).toBe(
            "Duplicate entry 'smith' for key 'people.name'"
          )
        ));
  });

  describe("getById", () => {
    test("returns error when gets data by undefined", async () =>
      await people
        .getById(undefined)
        .then((result) => expect(result).toBeUndefined())
        .catch((e) =>
          expect(e.message).toBe(
            "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
          )
        ));

    test("returns undefined when gets data by false", async () =>
      await people
        .getById(false)
        .then((result) => expect(result).toBeUndefined())
        .catch((e) => expect(e.message).toBe([])));

    test("returns undefined when gets data by NaN", async () =>
      await people
        .getById(NaN)
        .then((result) => expect(result).toBeUndefined())
        .catch((e) => expect(e.message).toBe([])));

    test("returns undefined when data doesn't exist", async () =>
      await people
        .getById(9)
        .then((result) => expect(result).toBeUndefined())
        .catch((e) => expect(e.message).toBe([])));

    test("returns error when gets data by wrong type of data", async () =>
      await people
        .getById("id")
        .then((result) => expect(result).toBeUndefined())
        .catch((e) =>
          expect(e.message).toBe("Truncated incorrect INTEGER value: 'id'")
        ));

    test("success to get data by id(string)", async () =>
      await people
        .getById(String(id))
        .then((result) => expect(typeof result).toBe("object"))
        .catch((e) => expect(e.message).toBe([])));

    test("success to get data by id(number)", async () =>
      await people
        .getById(id)
        .then((result) => expect(typeof result).toBe("object"))
        .catch((e) => expect(e.message).toBeUndefined()));
  });

  describe("update", () => {
    describe("name", () => {
      test("returns error when updates by null", async () =>
        await people
          .updateName(id, null)
          .catch((e) =>
            expect(e.message).toBe("Column 'name' cannot be null")
          ));

      test("returns '' when updates by ''", async () =>
        await people
          .updateName(id, "")
          .then((result) => expect(result).toBe(""))
          .catch((e) => expect(e.message).toBe([])));
    });

    describe("age", () => {
      test("'", async () =>
        await people
          .updateAge(id, "")
          .then((result) => expect(result).toBeUndefined())
          .catch((e) =>
            expect(e.message).toBe(
              "Incorrect integer value: '' for column 'age' at row 1"
            )
          ));

      test("-1", async () =>
        await people
          .updateAge(id, -1)
          .then((result) => expect(result).toBeUndefined())
          .catch((e) =>
            expect(e.message).toBe(
              "Check constraint 'people_chk_1' is violated."
            )
          ));

      test("object", async () =>
        await people
          .updateAge(id, { age: 10 })
          .then((result) => expect(result).toBeUndefined())
          .catch((e) =>
            expect(e.message).toBe(
              "Incorrect integer value: '{\"age\":10}' for column 'age' at row 1"
            )
          ));

      test("number", async () =>
        await people
          .updateAge(id, 10)
          .then((result) => expect(result).toBe(10))
          .catch((e) => expect(e.message).toBe([])));
    });
  });
});
