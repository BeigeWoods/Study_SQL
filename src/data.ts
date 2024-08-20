import { Pool } from "mysql2/promise";

export default class Repository {
  private db: Pool;
  constructor(db: Pool) {
    this.db = db;
  }

  async update(info: (string | number)[]) {
    await this.db.execute(
      `UPDATE datas SET name = ?, age = ? WHERE id = ?`,
      info
    );
  }
}
