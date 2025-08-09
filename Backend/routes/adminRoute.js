import express from 'express';
import con from '../utils/db.js';
import pool from '../utils/db3.js';
import { promisify } from 'util';
import verifyToken from '../middlewares/verifyToken.js';

const router = express.Router();
const query = promisify(con.query).bind(con);

// PUT /assign_role
router.get('/get_roles', async (req, res) => {
  const sql = 'SELECT id, role_name FROM user_roles';
  try{
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result, message: 'Roles fetched successfully.' });    
  }catch (err) {
    console.error(err);
    return res.status(500).json({ Status: false, Error: 'Internal Server Error' });
  }
});

router.put('/assign_role', verifyToken, async (req, res) => {
  const { userId, roleId } = req.body;

  try {
    await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, userId]);
    return res.json({ message: 'Role assigned successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to assign role.' });
  }
});

// Create User Route
router.post("/add_branch_name", async (req, res) => {
    try {
        const { name_np, name_en } = req.body;
        // Check for missing fields
        if (!name_np || !name_en) {
            return res.status(400).json({ message: "सबै फिल्डहरू आवश्यक छन्।" });
        }
        // Check if the username already exists
        const existingBranch = await query("SELECT id FROM branch WHERE name_np = ?", [name_np]);
        if (existingBranch.length > 0) {
            return res.status(400).json({ message: "यो शाखा नाम पहिल्यै अवस्थित छ।" });
        }
        // Insert user into the database
        const sql = `
            INSERT INTO branch (name_np, name_en, created_by) 
            VALUES (?, ?,0)`;

        try {
            const result = await query(sql, [name_np, name_en]);
            return res.json({ Status: true, Result: result, message: "प्रयोगकर्ता सफलतापूर्वक सिर्जना गरियो।" })
        } catch (err) {
            console.error("Database Query Error:", err);
            res.status(500).json({ Status: false, Error: "Internal Server Error" })
        }
    } catch (error) {
        console.error("User creation error:", error);
        return res.json({ Status: false, Error: error, message: "सर्भर त्रुटि भयो।" })
        res.status(500).json({ message: "सर्भर त्रुटि भयो।" });
    }
});

router.put("/update_branch_name/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const { name_np, name_en } = req.body;
        // Check for missing fields
        if (!name_np || !name_en) {
            return res.status(400).json({ message: "सबै फिल्डहरू आवश्यक छन्।" });
        }
        // Check if the username already exists
        const existingBranch = await query("SELECT id FROM branch WHERE name_np = ? AND id!=?", [name_np, id]);
        if (existingBranch.length > 0) {
            return res.status(400).json({ message: "यो शाखा नाम पहिल्यै अवस्थित छ।" });
        }
        // Insert user into the database
        const sql = `
            UPDATE branch SET name_np=? , name_en=?, updated_by=0 WHERE id=?`;
        const values = [name_np, name_en, id];
        try {
            const result = await query(sql, values);
            return res.json({ Status: true, Result: result, message: "प्रयोगकर्ता सफलतापूर्वक अद्यावधिक गरियो।" })
        } catch (err) {
            console.error("Database Query Error:", err);
            res.status(500).json({ Status: false, Error: "Internal Server Error" })
        }
    } catch (error) {
        console.error("User creation error:", error);
        return res.json({ Status: false, Error: error, message: "सर्भर त्रुटि भयो।" })
        res.status(500).json({ message: "सर्भर त्रुटि भयो।" });
    }
});

router.get('/get_branch_name', async (req, res) => {
    const sql = `SELECT * FROM branch`;
    try {
        const [result] = await pool.query(sql);
        return res.json({ Status: true, Result: result })
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ Status: false, Error: "Internal Server Error" })
    }
});

router.delete('/delete_user1/:id', async (req, res) => {
    const { id } = req.params;
    console.log(id)
    // Validate the ID to ensure it's a valid format (e.g., an integer)
    if (!Number.isInteger(parseInt(id))) {
        return res.status(400).json({ Status: false, Error: 'Invalid ID format' });
    }

    try {
        const sql = "DELETE FROM users WHERE id = ?";
        con.query(sql, [id], (err, result) => {
            if (err) {
                console.error('Database query error:', err); // Log the error for internal debugging
                return res.status(500).json({ Status: false, Error: 'Internal server error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ Status: false, Error: 'Record not found' });
            }

            return res.status(200).json({ Status: true, Result: result });
        });
    } catch (error) {
        console.error('Unexpected error:', error); // Log unexpected errors for internal debugging
        return res.status(500).json({ Status: false, Error: 'Unexpected error occurred' });
    }
});

//Office Operations

router.post("/add_office", async (req, res) => {
    try {
        const { name_np, name_en, state, district, municipality, ward, email, contact, headoffice } = req.body;
        // Check for missing fields
        if (!name_np) {
            return res.status(400).json({ message: "सबै फिल्डहरू आवश्यक छन्।" });
        }
        // Check if the name_np already exists
        const existingBranch = await query("SELECT id FROM office WHERE name_np = ?", [name_np]);
        if (existingBranch.length > 0) {
            return res.status(400).json({ message: "यो कार्यालय पहिल्यै अवस्थित छ।" });
        }
        // Insert user into the database
        const sql = `
            INSERT INTO office (name_np, name_en, state_id, district_id, municipality_id, ward, email, 
            contact, headoffice, created_by) 
            VALUES (?)`;
        const values = [name_np, name_en, state, district, municipality, ward, email, contact, headoffice, 0]
        try {
            const result = await query(sql, [values]);
            return res.json({ Status: true, Result: result, message: "कार्यालयको विवरण सफलता पुर्वक प्रविष्ट गरियो।" })
        } catch (err) {
            console.error("Database Query Error:", err);

            // Return custom error for incorrect integer values (e.g., Nepali digits)
            if (err.sqlMessage && err.sqlMessage.includes("Incorrect integer value")) {
                return res.status(500).json({
                    Status: false,
                    message: err.sqlMessage,                                       
                    Error: err.sqlMessage
                });
            }
            // res.status(500).json({ Status: false, Error: err })
        }
    } catch (error) {
        console.error("User creation error:", error);
        return res.json({ Status: false, Error: error, message: "सर्भर त्रुटि भयो।" })
        res.status(500).json({ message: "सर्भर त्रुटि भयो।" });
    }
});

router.put("/update_branch_name/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const { name_np, name_en } = req.body;
        // Check for missing fields
        if (!name_np || !name_en) {
            return res.status(400).json({ message: "सबै फिल्डहरू आवश्यक छन्।" });
        }
        // Check if the username already exists
        const existingBranch = await query("SELECT id FROM branch WHERE name_np = ? AND id!=?", [name_np, id]);
        if (existingBranch.length > 0) {
            return res.status(400).json({ message: "यो शाखा नाम पहिल्यै अवस्थित छ।" });
        }
        // Insert user into the database
        const sql = `
            UPDATE branch SET name_np=? , name_en=?, updated_by=0 WHERE id=?`;
        const values = [name_np, name_en, id];
        try {
            const result = await query(sql, values);
            return res.json({ Status: true, Result: result, message: "प्रयोगकर्ता सफलतापूर्वक अद्यावधिक गरियो।" })
        } catch (err) {
            console.error("Database Query Error:", err);
            res.status(500).json({ Status: false, Error: "Internal Server Error" })
        }
    } catch (error) {
        console.error("User creation error:", error);
        return res.json({ Status: false, Error: error, message: "सर्भर त्रुटि भयो।" })
        res.status(500).json({ message: "सर्भर त्रुटि भयो।" });
    }
});

router.get('/get_offices', async (req, res) => {
    const sql = `SELECT * FROM office ORDER BY name_np`;
    try {
        const result = await query(sql);
        return res.json({ Status: true, Result: result })
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ Status: false, Error: "Internal Server Error" })
    }
});

router.delete('/delete_user/:id', async (req, res) => {
    const { id } = req.params;
    console.log(id)
    // Validate the ID to ensure it's a valid format (e.g., an integer)
    if (!Number.isInteger(parseInt(id))) {
        return res.status(400).json({ Status: false, Error: 'Invalid ID format' });
    }

    try {
        const sql = "DELETE FROM users WHERE id = ?";
        con.query(sql, [id], (err, result) => {
            if (err) {
                console.error('Database query error:', err); // Log the error for internal debugging
                return res.status(500).json({ Status: false, Error: 'Internal server error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ Status: false, Error: 'Record not found' });
            }

            return res.status(200).json({ Status: true, Result: result });
        });
    } catch (error) {
        console.error('Unexpected error:', error); // Log unexpected errors for internal debugging
        return res.status(500).json({ Status: false, Error: 'Unexpected error occurred' });
    }
});

router.post("/add_app", async (req, res) => {
    console.log("Request Body:", req.body); // Log the request body for debugging
    try {
        const { user, app } = req.body;
        // Check for missing fields
        if (!user || !app) {
            return res.status(400).json({ message: "सबै फिल्डहरू आवश्यक छन्।" });
        }
        // Check if the username already exists
        const existingBranch = await query("SELECT id FROM user_apps WHERE user_id = ? AND app_id=?", [user, app]);
        if (existingBranch.length > 0) {
            return res.status(400).json({ message: "यो प्रयोगकर्तालाई यो एप पहिल्यै अवस्थित छ।" });
        }
        // Insert user into the database
        const sql = `
            INSERT INTO user_apps (user_id, app_id) 
            VALUES (?, ?)`;

        try {
            const result = await query(sql, [user, app]);
            return res.json({ Status: true, Result: result, message: "एप सफलता पूर्वक असाइन गरियो।" })
        } catch (err) {
            console.error("Database Query Error:", err);
            res.status(500).json({ Status: false, Error: "Internal Server Error" })
        }
    } catch (error) {
        console.error("User creation error:", error);
        return res.json({ Status: false, Error: error, message: "सर्भर त्रुटि भयो।" })
        res.status(500).json({ message: "सर्भर त्रुटि भयो।" });
    }
});

router.get('/get_assigned_apps', async (req, res) => {
    const { user_id } = req.query;

    const baseSql = `
        SELECT ua.id, u.name AS user_name, u.username, a.name_np AS app_name 
        FROM user_apps ua
        JOIN users u ON ua.user_id = u.id
        JOIN apps a ON ua.app_id = a.id
    `;

    const sql = user_id ? `${baseSql} WHERE ua.user_id = ?` : baseSql;
    const values = user_id ? [user_id] : [];

    try {
        const result = await query(sql, values);
        res.json({ Status: true, Result: result });
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ Status: false, Error: "Internal Server Error" });
    }
});


export { router as adminRouter };
