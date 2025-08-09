// // db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  ...(process.env.DB_PORT && { port: Number(process.env.DB_PORT) }),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // safe for both connection and pool
  // ✅ Do NOT pass acquireTimeout here directly
  ...(process.env.SSL && {
    ssl: {
      rejectUnauthorized: false,
    }
  })
});





// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   ...(process.env.DB_PORT && { port: process.env.DB_PORT }),
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   ...(process.env.SSL && {
//     ssl: {
//       rejectUnauthorized: false,
//     }
//   })
// });

export default pool;
