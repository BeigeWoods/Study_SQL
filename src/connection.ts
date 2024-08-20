import mysql, { PoolConnection } from "mysql2/promise.js";
import dotenv from "dotenv";
dotenv.config();

const init = {
  host: process.env["DB_HOST"],
  user: process.env["DB_USER"],
  database: process.env["DB_DATABASE"],
  password: process.env["DB_PASSWORD"],
};

const { database, user, password, host } = init;
const pool = mysql.createPool({ host, user, password, database });

export { pool };
