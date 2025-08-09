import cron from 'node-cron';
import pool from '../utils/db3.js';

// Runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const sql = `
      UPDATE visitors_customuser
      SET is_online = 0
      WHERE last_seen < NOW() - INTERVAL 3 MINUTE
    `;
    await pool.query(sql);
    console.log("🔴 Marked inactive users as offline");
  } catch (err) {
    console.error("❌ Error in offline marking:", err);
  }
});
