import express from 'express';
import { promisify } from 'util';
import pool from '../utils/db3.js';
import verifyToken from '../middlewares/verifyToken.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { insertEmpRoute, insertJd } from '../services/empService.js';

const router = express.Router();
const query = promisify(pool.query).bind(pool);

// Cloudinary Configuration
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/emp_photos';
        // console.log(uploadDir)
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        const { sanket_no, name_in_english } = req.body;
        if (!sanket_no || !name_in_english) {
            return cb(new Error('sanket_no and name_in_english are required'), null);
        }
        const ext = path.extname(file.originalname);
        const dateStr = new Date().toISOString().split('T')[0];
        const safeName = name_in_english.replace(/\s+/g, '_'); //sanitize spaces

        const uniqueName = `${sanket_no}_${safeName}_${dateStr}${ext}`;
        cb(null, uniqueName);
    }
});

// File filter (only images allowed)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|jfif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only image files are allowed!'));
};

//Size limit (1 MB max For now)
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1 * 1024 * 1024 },
});

router.post('/create_employee', verifyToken, upload.single('photo'), async (req, res) => {
    const user_id = req.user.id;
    const active_office = req.user.office_id;
    const photo_path = req.file ? `/uploads/emp_photo/${req.file.filename}` : null;
    const data = req.body;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        console.log('🟢 Transaction started for', req.user.office_np);

        const emp_id = await insertEmpRoute({ ...data, user_id, active_office, photo_path }, connection);
        console.log("✅ Employee ID:", emp_id);
        if (emp_id) {
            await insertJd(emp_id, { ...data, user_id, active_office }, user_id, active_office, connection);
        } else {
            await connection.rollback();
            return res.status(400).json({ Status: false, message: 'Failed to create employee.' });
        }

        await connection.commit();
        console.log('✅ Transaction committed for', req.user.office_np);

        res.json({ Status: true, message: 'Employee created successfully.', Result: emp_id });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Transaction error:', error);
        res.status(500).json({ Status: false, Error: 'Internal Server Error' });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/get_employees", verifyToken, async (req, res) => {
    const active_office = req.user.office_id;
    const user_role = req.user.role_name;
    let filters = 'WHERE is_active=1 '
    const params = [];
    if (user_role != 'superadmin') {
        filters += ' AND e.current_office_id=?'
        params.push(active_office)
    }
    const sql = `
        SELECT 
            e.id AS emp_id,
            e.name_in_nepali AS name,
            e.dob,
            e.sanket_no,
            e.photo_path,
            e.emp_type,
            eph.jd,
            eph.appointment_date_bs,
            eph.appointment_date_ad,
            eph.hajir_miti_bs,
            eph.hajir_miti_ad,
            eph.jd,
            eph.current_office_id,
            eph.office_id as kaaj_office_id,
            eph.is_office_chief,
            el.level_name_np,
            el.emp_rank_np,
            ep.post_name_np,
            esg.service_name_np,
            esg.group_name_np,
            o.letter_address AS current_office_np,
            oo.letter_address AS kaaj_office_np
        FROM employees e
        LEFT JOIN employee_post_history eph ON e.id = eph.employee_id
        LEFT JOIN emp_level el ON eph.level_id = el.id
        LEFT JOIN emp_post ep ON eph.post_id = ep.id
        LEFT JOIN emp_service_groups esg ON eph.service_group_id = esg.id
        LEFT JOIN offices o ON eph.current_office_id = o.id
        LEFT JOIN offices oo ON eph.office_id = oo.id
        LEFT JOIN emp_darbandies ed 
            ON ed.level_id = eph.level_id 
            AND ed.service_group_id = eph.service_group_id 
            AND ed.post_id = eph.post_id
        ${filters}
        ORDER BY eph.jd DESC
    `;

    try {
        const [rows] = await pool.query(sql,[params]);

        const grouped = {};
        rows.forEach(row => {
            const {
                emp_id,
                name,
                dob,
                emp_type,
                sanket_no,
                photo_path,
                jd,
                appointment_date_ad,
                appointment_date_bs,
                hajir_miti_bs,
                hajir_miti_ad,
                current_office_np,
                kaaj_office_np,
                is_office_chief,
                level_name_np,
                emp_rank_np,
                post_name_np,
                service_name_np,
                group_name_np,
            } = row;

            if (!grouped[emp_id]) {
                grouped[emp_id] = {
                    id: emp_id,
                    name,
                    dob,
                    emp_type,
                    current_office_np,
                    sanket_no,
                    photo_path,
                    post_history: [],
                    last_jd_type: null,
                    last_jd_entry: null,
                };
            }

            if (jd) {
                const postData = {
                    jd,
                    appointment_date_ad,
                    appointment_date_bs,
                    hajir_miti_bs,
                    hajir_miti_ad,
                    jd,
                    current_office_np,
                    kaaj_office_np,
                    is_office_chief,
                    level_name_np,
                    emp_rank_np,
                    post_name_np,
                    service_name_np,
                    group_name_np,
                };

                grouped[emp_id].post_history.push(postData);

                // Because of ORDER BY eph.jd DESC, the first jd will always be the latest
                if (!grouped[emp_id].last_jd_type) {
                    grouped[emp_id].last_jd_entry = postData;
                }
            }
        });

        const result = Object.values(grouped);

        res.json({
            Status: true,
            Result: result,
            message: "Employees with last jd_type fetched successfully.",
        });
    } catch (err) {
        console.error("Query Error:", err);
        res.status(500).json({
            Status: false,
            Error: "Internal Server Error",
        });
    }
});


router.get("/get_employees2", verifyToken, async (req, res) => {
    const active_office = req.user.office_id;

    const sql = `
        SELECT 
            e.id AS emp_id,
            e.name_in_nepali,
            e.dob,
            e.sanket_no,
            e.photo_path,
            eph.jd,
            eph.appointment_date_ad,
            eph.current_office_id,
            el.level_name_np,
            el.emp_rank_np,
            ep.post_name_np,
            esg.service_name_np,
            esg.group_name_np,
            o.letter_address AS current_office_np
        FROM employees e
        LEFT JOIN employee_post_history eph ON e.id = eph.employee_id
        LEFT JOIN emp_level el ON eph.level_id = el.id
        LEFT JOIN emp_post ep ON eph.post_id = ep.id
        LEFT JOIN emp_service_groups esg ON eph.service_group_id = esg.id
        LEFT JOIN offices o ON eph.current_office_id = o.id
        
        ORDER BY e.id DESC, eph.jd DESC
    `;

    try {
        const [rows] = await pool.query(sql);

        const grouped = {};
        rows.forEach(row => {
            const {
                emp_id,
                name,
                dob,
                sanket_no,
                photo_path,
                jd,
                appointment_date_ad,
                current_office_np,
                level_name_np,
                emp_rank_np,
                post_name_np,
                service_name_np,
                group_name_np,
            } = row;

            if (!grouped[emp_id]) {
                grouped[emp_id] = {
                    id: emp_id,
                    name,
                    dob,
                    sanket_no,
                    photo_path,
                    post_history: [],
                };
            }

            // Only push if eph exists (in case no post history)
            if (jd) {
                grouped[emp_id].post_history.push({
                    jd,
                    appointment_date_ad,
                    current_office_np,
                    level_name_np,
                    emp_rank_np,
                    post_name_np,
                    service_name_np,
                    group_name_np,
                });
            }
        });

        const result = Object.values(grouped);

        res.json({
            Status: true,
            Result: result,
            message: "Grouped employees with post history fetched successfully.",
        });
    } catch (err) {
        console.error("Query Error:", err);
        res.status(500).json({
            Status: false,
            Error: "Internal Server Error",
        });
    }
});

router.get("/get_employees1", verifyToken, async (req, res) => {
    const active_office = req.user.office_id;
    let baseWhere = `WHERE e.is_active>=1 `;
    const sql = `SELECT e.*, eph.*, el.level_name_np, el.emp_rank_np,
                ep.post_name_np, esg.service_name_np, esg.group_name_np,
                o.letter_address AS current_office_np
                FROM employees e
                LEFT JOIN offices o ON e.current_office_id = o.id
                LEFT JOIN employee_post_history eph ON e.id= eph.employee_id 
                AND eph.appointment_date_ad = (
                    SELECT MAX(appointment_date_ad) 
                    FROM employee_post_history eph2
                    WHERE eph2.employee_id = e.id
                    )
                    LEFT JOIN emp_level el ON eph.level_id = el.id
                    LEFT JOIN emp_service_groups esg ON eph.service_group_id = esg.id
                    LEFT JOIN emp_post ep ON eph.post_id = ep.id
                ${baseWhere}`;
    try {
        const [result] = await pool.query(sql, active_office);
        res.json({ Status: true, Result: result, message: 'Records fetched successfully.' });
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ Status: false, Error: "Internal Server Error" });
    }
});

//Get Darbandi:
router.get("/get_darbandi", verifyToken, async (req, res) => {
    const sql = `SELECT d.no_of_darbandi AS darbandi, 
                p.post_name_Np, 
                el.level_name_np, el.emp_rank_np,
                c.service_name_np, c.group_name_np, 
                o.letter_address AS office_np
            FROM 
            emp_darbandies d
            LEFT JOIN emp_level el ON d.level_id = el.id
            LEFT JOIN emp_post p ON d.post_id = p.id
            LEFT JOIN emp_service_groups c ON d.service_group_id = c.id
            LEFT JOIN offices o ON d.office_id = o.id       
            `;
    try {
        const result = await pool.query(sql);
        return res.json({ Status: true, Result: result, message: 'Records fetched successfully.' });
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ Status: false, Error: "Internal Server Error" });
    }
});

router.get("/get_posts", verifyToken, async (req, res) => {
    const sql = `SELECT * FROM emp_post`;

    try {
        const [result] = await pool.query(sql);
        res.json({ Status: true, Result: result, message: 'Records fetched successfully.' });
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ Status: false, Error: "Internal Server Error" });
    }
});

router.get("/get_level", verifyToken, async (req, res) => {
    const sql = `SELECT * FROM emp_level`;

    try {
        const [result] = await pool.query(sql);
        res.json({ Status: true, Result: result, message: 'Records fetched successfully.' });
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ Status: false, Error: "Internal Server Error" });
    }
});


router.get("/get_service_groups", verifyToken, async (req, res) => {
    const sql = `SELECT * FROM emp_service_groups`;
    try {
        const [result] = await pool.query(sql);
        res.json({ Status: true, Result: result, message: 'Records fetched successfully.' });
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ Status: false, Error: "Internal Server Error" });
    }
});

router.get("/get_emp_sanket_no", verifyToken, async (req, res) => {
    const sanket_no = req.query.sanket_no;
    console.log("Fetching employee with sanket_no:", sanket_no);
    const sql = `SELECT * FROM employees WHERE sanket_no =?`;
    try {
        const [result] = await pool.query(sql, [sanket_no]);
        res.json({ Status: true, Result: result, message: 'Records fetched successfully.' });
    } catch (err) {
        console.error("Database Query Error:", err);
        res.status(500).json({ Status: false, Error: "Internal Server Error" });
    }
});

router.get("/next_sanket_no_for_karar", verifyToken, async (req, res) => {
    const active_office = req.user.office_id;
    try {
        const [[officeRow]] = await pool.query(
            `SELECT id FROM offices WHERE id = ?`,
            [active_office]
        );

        if (!officeRow) return res.status(400).json({ Status: false, message: "Invalid office" });

        const office_id = officeRow.id;
        let newOfficeId;
        newOfficeId=office_id*1000

        const [[countRow]] = await pool.query(
            `SELECT COUNT(*) AS count 
             FROM employees e 
             JOIN offices o ON o.id = e.current_office_id 
             WHERE e.emp_type = 'करार' AND o.id = ?`,
            [active_office]
        );

        const nextCount = countRow.count + 1;

        const sanket_no = newOfficeId+nextCount;

        res.json({ Status: true, sanket_no });
    } catch (error) {
        console.error("❌ Sanket no generation failed:", error);
        res.status(500).json({ Status: false, Error: "Internal Server Error" });
    }
});




export { router as employeRouter };
