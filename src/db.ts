import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_Password || "password",
    database: "pulse",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
  .then(()=> console.log("Database is Running..."))
  .catch((err)=> console.log("Failed to Connect... " + err));

export default pool;  