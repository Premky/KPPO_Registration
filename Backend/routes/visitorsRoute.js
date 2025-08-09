import express from 'express';
import { promisify } from 'util';
import pool from '../utils/db3.js';
import verifyToken from '../middlewares/verifyToken.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { insertEmpRoute, insertJd } from '../services/empService.js';

const router = express.Router();
const query = promisify( pool.query ).bind( pool );

// Cloudinary Configuration
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });


router.post( '/create_visitor', verifyToken, async ( req, res ) => {
    const user_id = req.user.id;
    const active_office = req.user.office_id;
    const active_office_name = req.user.office_np;
    const photo_path = req.file ? `/uploads/emp_photo/${ req.file.filename }` : null;
    const data = req.body;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        console.log( '🟢 Transaction started for', req.user.office_np );
        console.log( 'data', data );
        // const address = `${data?.city_id}-${data?.district_id}, ${data?.province_id}`
        const values = [active_office_name, active_office, data.regd_no, data.regd_date, data.time, data.name, data.visitors_office,
            data.province_id, data.district_id, data.city_id, data.tole_ward, data.age, data.gender, data.mobile_no, data.vehicle, data.vehicle_no, data.branch, data.job, data.remarks, user_id,
            new Date(), data.time
        ];

        const [result] = await pool.query( `INSERT INTO visitors_visitor(office, office_id, regd_no, regd_date, time, name, visitors_office, 
                state_id, district_id, city_id, tole_ward, 
                age, gender, contact, vehicle, vehicle_no, branch, job, remarks, user, entered_date, entered_time)
                VALUE(?)`, [values] );

        await connection.commit();
        console.log( '✅ Transaction committed for', req.user.office_np );

        res.json( { Status: true, message: 'Visitor created successfully.' } );
    } catch ( error ) {
        if ( connection ) await connection.rollback();
        console.error( '❌ Transaction error:', error );
        res.status( 500 ).json( { Status: false, Error: 'Internal Server Error' } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.get( "/get_visitors", verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_office_name = req.user.office_np;
    const user_role = req.user.role_name;
    let filters = 'WHERE 1=1 ';
    const params = [];
    if ( user_role != 'superadmin' ) {
        filters += ' AND v.office=?';
        params.push( active_office_name );
    }
    const sql = `
        SELECT 
            v.*,
            ns.state_name_np, nd.district_name_np, nc.city_name_np
        FROM visitors_visitor v     
        LEFT JOIN np_state ns ON v.state_id = ns.state_id
        LEFT JOIN np_district nd ON v.district_id = nd.did
        LEFT JOIN np_city nc ON v.city_id=nc.cid   
        ${ filters }
        ORDER BY v.id DESC
    `;

    try {
        const [rows] = await pool.query( sql, [params] );

        res.json( {
            Status: true,
            Result: rows,
        } );
    } catch ( err ) {
        console.error( "Query Error:", err );
        res.status( 500 ).json( {
            Status: false,
            Error: "Internal Server Error",
        } );
    }
} );

router.put("/update_visitor/:id", verifyToken, async (req, res) => {
  const user_id = req.user.id;
  const id = req.params.id;
  const data = req.body;
    
  // Use consistent keys according to your DB
  const values = [
    data.regd_date,
    data.time,
    data.name,
    data.visitors_office,
    data.state_id || null,     // Changed province_id to state_id to match SQL
    data.district_id || null,
    data.city_id || null,
    data.tole_ward,
    data.age,
    data.gender,
    data.contact,
    data.vehicle,
    data.vehicle_no,
    data.branch,
    data.job,
    data.remarks,
    user_id,    new Date(),    new Date(),        // entered_time (if you want current time here, consider new Date())
    id,
  ];

  const sql = `
    UPDATE visitors_visitor 
    SET 
      regd_date = ?, 
      time = ?, 
      name = ?, 
      visitors_office = ?, 
      state_id = ?, 
      district_id = ?, 
      city_id = ?, 
      tole_ward = ?, 
      age = ?, 
      gender = ?, 
      contact = ?, 
      vehicle = ?, 
      vehicle_no = ?, 
      branch = ?, 
      job = ?, 
      remarks = ?, 
      user = ?, entered_date = ?, entered_time = ?
    WHERE id = ?
  `;

  try {
    console.log(data)
    const [result] = await pool.query(sql, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Visitor record not found" });
    }
    res.json({ message: "Visitor updated successfully" });
  } catch (error) {
    console.error("Update visitor error:", error);
    res.status(500).json({ message: "Failed to update visitor", error: error.message });
  }
});


router.get( "/get_visitors_count", verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_office_name = req.user.office_np;
    const user_role = req.user.role_name;
    let filters = 'WHERE 1=1 ';
    const params = [];
    if ( active_office != 1 ) {
        filters += ' AND v.office=?';
        params.push( active_office_name );
    }
    const sql = `
            SELECT 
        o.name, o.id,
        SUM(CASE WHEN v.gender = 'पुरुष' THEN 1 ELSE 0 END) AS male_count,
        SUM(CASE WHEN v.gender = 'महिला' THEN 1 ELSE 0 END) AS female_count,
        SUM(CASE WHEN v.gender = 'अन्य' THEN 1 ELSE 0 END) AS others_count,
        COUNT(*) AS total_count
    FROM visitors_visitor v
    JOIN visitors_office o ON v.office = o.name
    ${ filters }
    GROUP BY o.id, o.code 
    ORDER BY  o.id, o.code
    `;

    try {
        const [rows] = await pool.query( sql, [params] );

        res.json( {
            Status: true,
            Result: rows,
        } );
    } catch ( err ) {
        console.error( "Query Error:", err );
        res.status( 500 ).json( {
            Status: false,
            Error: "Internal Server Error",
        } );
    }
} );




router.get( "/get_emp_sanket_no", verifyToken, async ( req, res ) => {
    const sanket_no = req.query.sanket_no;
    console.log( "Fetching employee with sanket_no:", sanket_no );
    const sql = `SELECT * FROM employees WHERE sanket_no =?`;
    try {
        const [result] = await pool.query( sql, [sanket_no] );
        res.json( { Status: true, Result: result, message: 'Records fetched successfully.' } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( "/get_next_sanket_no", verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_office_name = req.user.office_np;
    try {
        const [[officeRow]] = await pool.query(
            `SELECT id, code FROM visitors_office WHERE name = ?`,
            [active_office_name]
        );

        if ( !officeRow ) return res.status( 400 ).json( { Status: false, message: "Invalid office" } );

        const office_id = officeRow.id;
        const office_code = officeRow.code;
        let newOfficeId;
        newOfficeId = office_id;

        const [[countRow]] = await pool.query(
            `SELECT COUNT(*) AS count 
             FROM visitors_visitor e 
             JOIN visitors_office o ON o.name = e.office 
             WHERE o.name = ?`,
            [active_office_name]
        );

        const nextCount = countRow.count + 1;

        const sanket_no = office_code + '-' + nextCount;
        console.log( sanket_no );
        res.json( { Status: true, sanket_no } );
    } catch ( error ) {
        console.error( "❌ Sanket no generation failed:", error );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );




export { router as visitorsRoute };
