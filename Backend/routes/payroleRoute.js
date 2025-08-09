import express from 'express';
import con from '../utils/db.js';
import pool from '../utils/db3.js';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import NepaliDate from 'nepali-datetime';
import dateConverter from 'nepali-datetime/dateConverter';

import { calculateBSDate } from '../utils/dateCalculator.js';
import verifyToken from '../middlewares/verifyToken.js';

const userBasedStatusMap1 = {
    clerk: [1, 2],
    office_admin: [1, 2],
    supervisor: [4, 5],
    headoffice_approver: [6, 7],
    branch_superadmin: [1, 2, 3, 4, 5, 6],
    office_superadmin: [1, 2, 3, 4],
    superadmin: 'all',
};

async function getUserBasedStatusMap() {
    const [rows] = await pool.query( `
    SELECT ur.id, ur.role_name, rsr.payrole_status_id, ps.payrole_status_name
            FROM payrole_status_roles rsr 
            LEFT JOIN user_roles ur ON rsr.role_id=ur.id
            LEFT JOIN payrole_status ps ON rsr.payrole_status_id=ps.id
  `);

    const map = {};

    for ( const row of rows ) {
        const role = row.role_name;
        const statusId = row.payrole_status_id;

        if ( !map[role] ) {
            map[role] = [];
        }
        map[role].push( statusId );
    }

    // Optionally, handle special cases
    map.superadmin = 'all';

    return map;
}


const router = express.Router();
// const query = promisify(con.query).bind(con);
const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );



import NepaliDateConverter from 'nepali-date-converter';
const current_date = new NepaliDate().format( 'YYYY-MM-DD' );
const fy = new NepaliDate().format( 'YYYY' ); //Support for filter
const fy_date = fy + '-04-01';

import { bs2ad } from '../utils/bs2ad.js';
// console.log(current_date);
// console.log(fy_date)

//गाडीका विवरणहरुः नाम सुची
// Promisify specific methods
// const queryAsync = promisify( con.query ).bind( con );
// const beginTransactionAsync = promisify( con.beginTransaction ).bind( con );
// const commitAsync = promisify( con.commit ).bind( con );
// const rollbackAsync = promisify( con.rollback ).bind( con );
const query = promisify( con.query ).bind( con );

// Convert BS to AD
// const adDate = bs.toGregorian('2081-03-01'); // Output: { year: 2024, month: 6, day: 14 }

// English to Nepali date conversion
const [npYear, npMonth, npDay] = dateConverter.englishToNepali( 2023, 5, 27 );



async function calculateAge( birthDateBS ) {
    // Convert BS to AD
    const nepaliDate = new NepaliDate( birthDateBS );
    const adDate = nepaliDate.getDateObject(); // Converts to JavaScript Date

    // Get current date
    const currentDate = new Date();

    // Calculate age
    let age = currentDate.getFullYear() - adDate.getFullYear();
    const m = currentDate.getMonth() - adDate.getMonth();

    // Adjust age if birthday hasn't occurred yet this year
    if ( m < 0 || ( m === 0 && currentDate.getDate() < adDate.getDate() ) ) {
        age--;
    }

    return age;
}

async function generateUniqueBandiId() {
    const maxAttempts = 10;

    for ( let i = 0; i < maxAttempts; i++ ) {
        const randId = Math.floor( 100000 + Math.random() * 900000 ); // 6-digit random number
        const [result] = await pool.query(
            `SELECT office_bandi_id FROM bandi_person WHERE office_bandi_id = ?`,
            [randId]
        );

        if ( result.length === 0 ) {
            return randId; // Unique ID
        }
    }

    throw new Error( "Unable to generate a unique bandi ID after multiple attempts." );
}

router.get( '/get_random_bandi_id', async ( req, res ) => {
    const rand_bandi_id = await generateUniqueBandiId();
    // console.log( rand_bandi_id );
    return res.json( { Status: true, Result: rand_bandi_id } );
} );

//Define storage configuration
const storage = multer.diskStorage( {
    destination: function ( req, file, cb ) {
        const uploadDir = './uploads/bandi_photos';
        if ( !fs.existsSync( uploadDir ) ) {
            fs.mkdirSync( uploadDir, { recursive: true } );
        }
        cb( null, uploadDir );
    },
    filename: function ( req, file, cb ) {
        const { office_bandi_id, bandi_name } = req.body;

        if ( !office_bandi_id || !bandi_name ) {
            return cb( new Error( 'bandi_id and bandi_name are required' ), null );
        }

        const ext = path.extname( file.originalname );
        const dateStr = new Date().toISOString().split( 'T' )[0];
        const safeName = bandi_name.replace( /\s+/g, '_' ); //sanitize spaces

        const uniqueName = `${ office_bandi_id }_${ safeName }_${ dateStr }${ ext }`;
        cb( null, uniqueName );
    }
} );

// File filter (only images allowed)
const fileFilter = ( req, file, cb ) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test( path.extname( file.originalname ).toLowerCase() );
    const mimetype = allowedTypes.test( file.mimetype );

    if ( extname && mimetype ) return cb( null, true );
    cb( new Error( 'Only image files are allowed!' ) );
};

//Size limit (1 MB max For now)
const upload = multer( {
    storage,
    fileFilter,
    limits: { fileSize: 1 * 1024 * 1024 },
} );

router.get( '/get_payroles', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const userRole = req.user.role_name;
    // console.log( req.query );
    const {
        searchOffice = 0,
        nationality = 0,
        searchpayroleStatus = 1,
        searchpyarole_rakhan_upayukat = 0,
        searchpayrole_no_id = 0,
        searchmudda_id = 0,
        searchbandi_name = '',
        searchchecked = 0,
        searchis_checked = '',
    } = req.query;
    const mudda_group_id = searchmudda_id;

    const [searchedStatusKeyRow] = await pool.query( `SELECT id FROM payrole_status WHERE status_key=?`, [searchpayroleStatus] );
    const searchedStatusKey = searchedStatusKeyRow[0];
    // console.log(searchedStatusKey.id)
    // console.log( req.query );
    const page = parseInt( req.query.page ) || 0;
    const limit = parseInt( req.query.limit ) || 25;
    const offset = page * limit;

    let baseWhere = ` WHERE 1=1 `;
    const roleMap = await getUserBasedStatusMap();
    let allowedStatuses = roleMap[userRole] ?? [];

    if ( allowedStatuses === 'all' ) {
        const [allStatuses] = await pool.query( 'SELECT id FROM payrole_status' );
        allowedStatuses = allStatuses.map( status => status.id );
    }

    // console.log( allowedStatuses );
    const params = [];

    // ✅ Payrole status filter
    if ( searchedStatusKey ) {
        const status = Number( searchedStatusKey.id );
        if ( allowedStatuses === 'all' || allowedStatuses.includes( status ) ) {
            baseWhere += ` AND p.status = ? `;
            params.push( status );
        } else {
            return res.status( 403 ).json( {
                Status: false,
                Error: `You are not authorized to view payroles with status ${ status }`,
            } );
        }
    } else {
        if ( allowedStatuses !== 'all' ) {
            const placeholders = allowedStatuses.map( () => '?' ).join( ',' );
            baseWhere += ` AND p.status IN (${ placeholders }) `;
            params.push( ...allowedStatuses );
        }
    }

    if ( searchmudda_id ) {
        const escapedGroupId = con.escape( searchmudda_id );
        console.log( 'mudda group', searchmudda_id );
        if ( baseWhere ) {
            baseWhere += ` AND bp.id IN (
                SELECT bmd.bandi_id 
                FROM bandi_mudda_details bmd
                LEFT JOIN muddas m ON bmd.mudda_id = m.id
                WHERE m.muddas_group_id = ${ escapedGroupId }
            )`;
        } else {
            baseWhere += `WHERE bp.id IN (
                SELECT bmd.bandi_id 
                FROM bandi_mudda_details bmd
                LEFT JOIN muddas m ON bmd.mudda_id = m.id
                WHERE m.muddas_group_id =${ escapedGroupId }`;
        }
    }

    if ( searchpayrole_no_id ) {
        const escapedGroupId = con.escape( searchpayrole_no_id );
        if ( baseWhere ) {
            baseWhere += ` AND p.payrole_no_id = ${ escapedGroupId }`;
        } else {
            baseWhere += `p.payrole_no_id = ${ escapedGroupId }`;
        }
    }

    // ✅ Office filter
    if ( active_office == 1 || active_office == 2 ) {
        if ( searchOffice && searchOffice !== '0' ) {
            baseWhere += ` AND bp.current_office_id = ? `;
            params.push( searchOffice );
        } else if ( active_office !== 1 && active_office !== 2 ) {
            baseWhere += ` AND bp.current_office_id = ? `;
            params.push( active_office );
        }
    } else {
        baseWhere += ` AND bp.current_office_id = ? `;
        params.push( active_office );
    }

    // ✅ Nationality filter
    if ( nationality !== undefined && nationality !== '' ) {
        baseWhere += ` AND TRIM(nationality) LIKE CONCAT('%', ?, '%')`;
        params.push( nationality );
    }


    // ✅ Pyarole Rakhan Upayukat
    if ( searchpyarole_rakhan_upayukat ) {
        baseWhere += ` AND p.pyarole_rakhan_upayukat = ? `;
        params.push( searchpyarole_rakhan_upayukat );
    }

    // ✅ is_checked (boolean filter)
    if ( searchis_checked ) {
        baseWhere += ` AND p.is_checked = ? `;
        params.push( searchis_checked );
    }

    // ✅ Optional: bandi name search (partial match)
    if ( searchbandi_name ) {
        baseWhere += ` AND bp.bandi_name LIKE ? `;
        params.push( `%${ searchbandi_name }%` );
    }

    try {
        // Step 1: Get matching bandi IDs
        const idQuery = `
            SELECT bp.id FROM bandi_person bp 
            LEFT JOIN payroles p ON bp.id = p.bandi_id
            ${ baseWhere }
            ORDER BY bp.id DESC
            LIMIT ? OFFSET ?
        `;
        const [idRows] = await pool.query( idQuery, [...params, limit, offset] );

        const bandiIds = idRows.map( row => row.id );
        if ( bandiIds.length === 0 ) {
            return res.json( { Status: true, Result: [], TotalCount: 0 } );
        }

        // Step 2: Get total count
        const countSQL = `
            SELECT COUNT(*) AS total FROM bandi_person bp
            LEFT JOIN payroles p ON bp.id = p.bandi_id
            ${ baseWhere }
        `;
        const [countResult] = await pool.query( countSQL, params );
        const totalCount = countResult[0].total;

        // Step 3: Fetch full data
        const placeholders = bandiIds.map( () => '?' ).join( ',' );
        const fullQuery = `
            SELECT 
                bp.id AS bandi_id,
                bp.*,
                bp.nationality,
                TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) AS current_age,
                ba.wardno,
                ba.bidesh_nagarik_address_details,
                nc.country_name_np,
                ns.state_name_np,
                nd.district_name_np,
                nci.city_name_np,
                bmd_combined.mudda_id,
                bmd_combined.mudda_name,
                bmd_combined.mudda_no,
                bmd_combined.is_main_mudda,
                bmd_combined.is_last_mudda,
                bmd_combined.mudda_phesala_antim_office_id,
                -- bmd_combined.office_name_with_letter_address,
                bmd_combined.vadi,
                bmd_combined.thuna_date_bs AS bmd_thuna_date,
                bmd_combined.release_date_bs AS bmd_release_date,
                bmd_combined.mudda_phesala_antim_office,
                bmd_combined.mudda_phesala_antim_office_date,
                bkd.hirasat_years, bkd.hirasat_months, bkd.hirasat_days,
                bkd.thuna_date_bs, bkd.release_date_bs,
                p.id AS payrole_id,
                p.status AS payrole_status,
                p.payrole_no_id,
                p.payrole_entry_date,
                p.payrole_count_date,
                p.payrole_reason,
                p.remark,
                p.is_checked,
                p.pyarole_rakhan_upayukat,
                p.dopm_remarks,                
                ncr.city_name_np AS recommended_city, ndr.district_name_np AS recommended_district,
                p.recommended_tole_ward,
                ro.office_name_with_letter_address AS recommended_court,
                pm.mudda_name AS payrole_mudda_name,
                o.letter_address,
                
                bpdOffice.office_name_with_letter_address AS punarabedan_office_name,                
                bpd.punarabedan_office_ch_no,
                bpd.punarabedan_office_date

                -- bfd

            FROM payroles p
            LEFT JOIN bandi_person bp ON p.bandi_id=bp.id
            LEFT JOIN bandi_address ba ON bp.id = ba.bandi_id
            LEFT JOIN np_country nc ON ba.nationality_id = nc.id
            LEFT JOIN np_state ns ON ba.province_id = ns.state_id
            LEFT JOIN np_district nd ON ba.district_id = nd.did
            LEFT JOIN np_city nci ON ba.gapa_napa_id = nci.cid
            LEFT JOIN np_district ndr ON p.recommended_district = ndr.did
            LEFT JOIN np_city ncr ON p.recommended_city = ncr.cid
            LEFT JOIN offices ro ON p.recommended_court_id = ro.id
            LEFT JOIN bandi_kaid_details bkd ON bp.id = bkd.bandi_id 
            LEFT JOIN bandi_release_details brd ON bp.id = brd.bandi_id       
            LEFT JOIN muddas pm ON p.payrole_mudda_id = pm.id
            LEFT JOIN offices o ON bp.current_office_id = o.id
            LEFT JOIN bandi_punarabedan_details bpd ON bp.id=bpd.bandi_id
            LEFT JOIN offices bpdOffice ON bpd.punarabedan_office_id = bpdOffice.id            
            LEFT JOIN bandi_fine_details bfd ON bp.id=bfd.bandi_id            

            LEFT JOIN (
                    SELECT *
                    FROM (
                        SELECT 
                            bmd.bandi_id,
                            bmd.mudda_id,
                            m.mudda_name,
                            bmd.mudda_no,
                            bmd.thuna_date_bs,
                            bmd.release_date_bs,
                            bmd.vadi,
                            bmd.is_main_mudda,
                            bmd.is_last_mudda,
                            bmd.mudda_phesala_antim_office_id,
                            bmd.mudda_phesala_antim_office_date,
                            o.office_name_with_letter_address AS mudda_phesala_antim_office,
                            ROW_NUMBER() OVER (
                                PARTITION BY bmd.bandi_id 
                                ORDER BY 
                                    (bmd.is_main_mudda = 1 AND bmd.is_last_mudda = 1) DESC,
                                    bmd.is_main_mudda DESC,
                                    bmd.is_last_mudda DESC,
                                    bmd.id DESC
                            ) AS rn
                        FROM bandi_mudda_details bmd
                        LEFT JOIN muddas m ON bmd.mudda_id = m.id
                        LEFT JOIN offices o ON bmd.mudda_phesala_antim_office_id = o.id
                    ) ranked
                    WHERE ranked.rn = 1
                ) AS bmd_combined ON bp.id = bmd_combined.bandi_id

            WHERE bp.id IN (${ placeholders })
            ORDER BY p.id DESC
        `;
        // console.log( bandiIds );
        const [fullRows] = await pool.query( fullQuery, bandiIds );

        // Step 4: Group bandis and muddas
        const grouped = {};
        fullRows.forEach( row => {
            const {
                bandi_id,
                mudda_id,
                mudda_no,
                mudda_name,
                is_main_mudda,
                is_last_mudda,
                punarabedan_office,
                vadi,
                mudda_phesala_antim_office,
                mudda_phesala_antim_office_date,
                bmd_thuna_date,
                bmd_release_date,
                ...bandiData
            } = row;

            if ( !grouped[bandi_id] ) {
                grouped[bandi_id] = {
                    ...bandiData,
                    bandi_id,
                    muddas: []
                };
            }

            if ( mudda_id ) {
                grouped[bandi_id].muddas.push( {
                    mudda_id,
                    mudda_no,
                    mudda_name,
                    is_main_mudda,
                    is_last_mudda,
                    vadi,
                    mudda_phesala_antim_office,
                    mudda_phesala_antim_office_date,
                    bmd_thuna_date,
                    bmd_release_date
                } );
            }
        } );

        return res.json( {
            Status: true,
            Result: Object.values( grouped ),
            TotalCount: totalCount
        } );

    } catch ( err ) {
        console.error( 'Query Error:', err );
        return res.status( 500 ).json( { Status: false, Error: 'Query Error' } );
    }
} );

// Node/Express route (example using MySQL)
router.post( '/get_all_bandi_fines', async ( req, res ) => {
    const { bandiIds } = req.body;
    if ( !Array.isArray( bandiIds ) || bandiIds.length === 0 ) {
        return res.json( { Status: false, Error: "Invalid bandiIds" } );
    }

    try {
        const [results] = await pool.query(
            `SELECT * FROM bandi_fines WHERE bandi_id IN (?)`,
            [bandiIds]
        );
        res.json( { Status: true, Result: results } );
    } catch ( error ) {
        console.error( error );
        res.json( { Status: false, Error: "Failed to fetch fines" } );
    }
} );


router.get( '/get_bandi_for_payrole', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_user = req.user.username;
    const office_id = req.query.office_id; // extract if passed manually
    const filters = [];
    const params = [];

    // Apply filters based on office
    // if ( active_office !== 1 && active_office !== 2 ) {
    //     filters.push( '1=1' );
    //     // params.push( active_office );
    // } else if ( office_id ) {
    //     filters.push( 'o.id = ?' );
    //     params.push( office_id );
    // }
    filters.push( 'o.id=?' );
    params.push( office_id || active_office );
    // Filter only कैदी type
    filters.push( 'bp.bandi_type = ?' );
    params.push( 'कैदी' );
    filters.push( '(bfd.amount_fixed IS NULL OR (bfd.amount_fixed = 0 OR bfd.amount_deposited>0))' ); // Ensure no fines or only paid fines

    const whereClause = filters.length > 0 ? `WHERE ${ filters.join( ' AND ' ) }` : '';
    const sql = `
        SELECT 
        bp.id, bp.office_bandi_id, bp.bandi_name, bp.bandi_type, 
        bkd.hirasat_years, bkd.hirasat_months, bkd.hirasat_days,
        bkd.release_date_bs, bkd.release_date_ad, 
        bkd.thuna_date_bs, bkd.thuna_date_ad 
        FROM bandi_person bp
        LEFT JOIN bandi_kaid_details bkd ON bkd.bandi_id = bp.id
        LEFT JOIN bandi_fine_details bfd ON bfd.bandi_id = bp.id        
        LEFT JOIN offices o ON o.id = bp.current_office_id
        ${ whereClause }
    `;

    try {
        const [result] = await pool.query( sql, params );
        res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );


router.get( '/get_bandi_name_for_select', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    // console.log(active_office)
    // const user_id = req.user.id;
    let sql = '';
    if ( active_office <= 2 ) {
        sql = `SELECT bp.*, bp.id AS bandi_id, bp.id AS bandi_office_id,
                        m.mudda_name, 
                        p.id AS payrole_id 
                    FROM bandi_person bp
                        LEFT JOIN bandi_mudda_details bmd ON bp.id=bmd.bandi_id 
                        LEFT JOIN muddas m ON bmd.mudda_id=m.id  
                        LEFT JOIN payroles p ON bp.id=p.bandi_id
                     WHERE bmd.is_main_mudda=1`;
    } else {
        sql = `SELECT bp.*, bp.id AS bandi_id, bp.id AS bandi_office_id,
                        p.id AS payrole_id, 
                        m.mudda_name 
                    FROM bandi_person bp
                        LEFT JOIN bandi_mudda_details bmd ON bp.id=bmd.bandi_id
                        LEFT JOIN muddas m ON bmd.mudda_id=m.id
                        JOIN payroles p ON bp.id=bandi_id
                    WHERE bmd.is_main_mudda=1 WHERE bp.current_office_id=${ active_office }`;
    }
    try {
        const [result] = await pool.query( sql ); // Use promise-wrapped query

        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi not found for select" } );
        }
        const bandi = result[0];
        // 🟢 Calculate age from BS DOB
        const age = await calculateAge( bandi.dob ); // Assuming dob is BS like '2080-01-10'
        bandi.age = age;
        // console.log(age)
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.get( '/get_selected_bandi/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT b.*, bm.*, m.mudda_name 
        FROM bandies b
        LEFT JOIN bandi_mudda bm ON b.id = bm.bandi_id 
        LEFT JOIN muddas m ON bm.mudda_id = m.id
        WHERE b.id = ? AND bm.is_main = 1
    `;

    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query

        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi not found" } );
        }
        const bandi = result[0];
        // 🟢 Calculate age from BS DOB
        const age = await calculateAge( bandi.dob ); // Assuming dob is BS like '2080-01-10'
        bandi.age = age;
        // console.log(age)
        return res.json( { Status: true, Result: bandi } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.post( '/create_payrole', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const user_role_id = req.user.role_id;

    const {
        bandi_id,
        payrole_no,
        mudda_id,
        payrole_count_date,
        payrole_entry_date,
        recommended_district,
        recommended_city,
        recommended_tole_ward,
        recommended_court_id,
        other_details,
        payrole_reason,
        payrole_remarks,
        payrole_niranay_no,
        payrole_decision_date,
        payrole_granted_letter_no,
        payrole_granted_letter_date,
        pyarole_rakhan_upayukat,
        dopmremark
    } = req.body;

    let payrole_no_bandi_id = '';
    if ( bandi_id && payrole_no ) {
        payrole_no_bandi_id = `${ payrole_no }${ bandi_id }`;
    }

    try {
        const [office_bandi_id_res] = await pool.query(
            `SELECT office_bandi_id FROM bandi_person WHERE id = ?`,
            [bandi_id]
        );
        const office_bandi_id = office_bandi_id_res[0]?.office_bandi_id;

        const [chk_payrole_duplicate] = await pool.query(
            `SELECT office_bandi_id FROM payroles WHERE office_bandi_id = ?`,
            [office_bandi_id]
        );

        if ( chk_payrole_duplicate.length > 0 ) {
            return res.status( 409 ).json( {
                Status: false,
                message: `बन्दी ID ${ office_bandi_id } को प्यारोल सिफारिस अगाडि नै भइसकेको छ।`
            } );
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const values = [
                bandi_id,
                office_bandi_id,
                payrole_entry_date,
                recommended_district,
                recommended_city,
                recommended_tole_ward,
                recommended_court_id,
                payrole_reason,
                other_details,
                payrole_remarks,
                1, // status
                payrole_no,
                0,
                user_role_id,
                'Pending',
                user_id,
                active_office,
                active_office
            ];

            const sql = `
                INSERT INTO payroles (
                    bandi_id, office_bandi_id, payrole_entry_date, 
                    recommended_district, recommended_city, recommended_tole_ward, recommended_court_id,
                    payrole_reason, other_details, remark, status, payrole_no_id, is_checked,
                    user_role_id, is_completed, created_by, created_office, updated_office
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await connection.query( `UPDATE bandi_person SET is_under_facility=? WHERE id=?`, [1, bandi_id] );
            const [result] = await connection.query( sql, values );
            await connection.commit();

            return res.json( {
                Status: true,
                message: "प्यारोल सफलतापूर्वक सुरक्षित गरियो।"
            } );
        } catch ( error ) {
            await connection.rollback();
            console.error( "Transaction failed:", error );
            return res.status( 500 ).json( {
                Status: false,
                Error: error.message,
                message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
            } );
        } finally {
            connection.release();
        }
    } catch ( error ) {
        console.error( "Server error:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो।"
        } );
    }
} );

router.get( '/get_accepted_payroles', verifyToken, async ( req, res ) => {
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;

    try {
        const baseQuery = `
      SELECT 
        p.*, 
        bp.bandi_name, 
        bp.id AS bandi_id,
        m.mudda_name
      FROM payroles p
      LEFT JOIN bandi_person bp ON p.bandi_id = bp.id
      LEFT JOIN muddas m ON p.payrole_mudda_id = m.id
      WHERE p.status = 5
    `;

        let finalQuery = baseQuery;
        let queryParams = [];

        // Restrict results for lower-level offices (office_id >= 2)
        if ( user_office_id > 2 ) {
            finalQuery += ` AND (p.created_office = '?' OR p.updated_office = '?')`;
            queryParams = [user_office_id, user_office_id];
        }

        // console.log(finalQuery)

        const [result] = await pool.query( finalQuery, queryParams );
        console.log( 'acceptedpayrole', user_office_id );
        if ( !result.length ) {
            return res.json( { Status: false, Error: 'No payrole records found' } );
        }

        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'Error fetching accepted payroles:', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal server error' } );
    }
} );

router.put( '/return_payrole/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const payrole_id = req.params.id;
    const { dopmremark, status } = req.body;
    const new_status = Number( status ) - 1;
    console.log( 'status', status, 'new_status', new_status );

    const sql = `UPDATE payroles SET 
                 status=?, 
                 can_view_by_office=?, 
                 is_checked=?, 
                 dopm_remarks=?, 
                 updated_by=?, 
                 updated_at=?, 
                 updated_office=? 
               WHERE id=?`;

    const values = [
        new_status,      // status
        1,               // can_view_by_office
        1,               // is_checked
        dopmremark,      // dopm_remarks
        user_id,         // updated_by
        new Date(),      // updated_at
        active_office,   // updated_office
        payrole_id       // WHERE id = ?
    ];

    try {
        const [result] = await pool.query( sql, values );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'Database error', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal Server Error' } );
    }
} );

router.put( '/update_payrole/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_user_id = req.user.username;
    const active_role = req.user.role_name;

    const reqData = req.body;

    console.log( reqData );
    const [to_status_role_id] = await pool.query( `
        SELECT psr.role_id, psr.payrole_status_id
        FROM payrole_status_roles psr
        LEFT JOIN payrole_status ps ON psr.payrole_status_id=ps.id        
        WHERE ps.status_key=?
        `, [reqData.to_role] );
    const status_id = to_status_role_id[0].payrole_status_id;
    const role_id = to_status_role_id[0].role_id;

    let sql;
    let values;
    if ( reqData.remarks ) {
        sql = `UPDATE payroles SET user_role_id=?, status=?, remark=?, updated_by=?, updated_at=? WHERE id=?`;
        values = [role_id, status_id, reqData.remarks, active_user_id, new Date(), reqData.payrole_id];
    } else if ( reqData.dopm_remarks ) {
        sql = `UPDATE payroles SET user_role_id=?, status=?, dopm_remarks=?, updated_by=?, updated_at=? WHERE id=?`;
        values = [role_id, status_id, reqData.dopm_remarks, active_user_id, new Date(), reqData.payrole_id];
    }

    try {
        const [result] = await pool.query( sql, values );

        res.json( { status: true, message: "Payrole updated successfully", result } );
    } catch ( error ) {
        console.log( error );
        res.status( 500 ).json( { status: false, message: "Server error", error } );
    }
} );

router.put( '/update_payrole_status/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const payrole_id = req.params.id;
    const { pyarole_rakhan_upayukat, dopmremark } = req.body;
    // console.log( req.body );
    let sql;
    let values;
    if ( pyarole_rakhan_upayukat == 'पास' || pyarole_rakhan_upayukat == 'फेल' ) {
        const [board_decision] = await pool.query( `SELECT id FROM payrole_status WHERE status_key=?`, ['board_decision'] );
        const status_id = board_decision[0].id;
        sql = `UPDATE payroles SET pyarole_rakhan_upayukat=?,status=?, dopm_remarks=? WHERE id=?`;
        values = [pyarole_rakhan_upayukat, status_id, dopmremark, payrole_id];
    } else {
        sql = `UPDATE payroles SET pyarole_rakhan_upayukat=?, dopm_remarks=? WHERE id=?`;
        values = [pyarole_rakhan_upayukat, dopmremark, payrole_id];
    }
    // console.log( values );
    try {
        const [result] = await pool.query( sql, values );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'Database error', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal Server Error' } );
    }
} );


router.put( '/update_is_payrole_checked/:id', verifyToken, async ( req, res ) => {
    const id = req.params.id;
    // console.log( 'payrole_id', id );
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;
    const {
        is_checked
    } = req.body;
    // console.log('dopmremark',status)    
    const updated_by = user_id;
    const sql = `UPDATE payroles SET is_checked =? WHERE id =?; `;
    const values = [
        is_checked, id
    ];
    try {
        const result = await query( sql, values );
        // console.log(result)
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'Database error', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal Server Error' } );
    }
} );

router.put( '/update_payrole_logs/:id', verifyToken, async ( req, res ) => {
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;
    const {
        payrol_id,
        hajir_current_date,
        hajir_status,
        hajir_next_date,
        hajir_office,
        no_hajir_reason,
        no_hajir_mudda,
        no_hajir_mudda_district,
        no_hajir_reason_office_type,
        no_hajir_reason_office_id,
        no_hajir_reason_office_name,
        no_hajir_is_pratibedan,
        no_hajir_is_aadesh,
        hajir_remarks
    } = req.body;



    try {
        let sql = '';
        let values = [];

        if ( hajir_status == '2' ) {
            console.log( "अनुपस्थित" );
        }


        const queryResult = await query( sql, values );
        return res.json( { Status: true, Result: queryResult } );

    } catch ( err ) {
        console.error( 'Database error', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal Server Error' } );
    }
} );

router.post( '/create_payrole_maskebari_count', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_user = req.user.username;
    try {
        // Add active_user and active_office to the request body
        req.body.created_by = active_user;
        req.body.created_office = active_office;
        const keys = Object.keys( req.body );
        const values = Object.values( req.body );
        const placeholders = keys.map( () => '?' ).join( ', ' );
        const sql = `INSERT INTO payrole_maskebari (${ keys.join( ', ' ) }) VALUES (${ placeholders })`;
        const result = await pool.query( sql, values );
        // console.log( result );
        res.status( 201 ).json( { id: result.insertId } );
    } catch ( err ) {
        console.log( err );
        res.status( 500 ).json( { error: err.message } );
    }
} );

router.delete( '/delete_payrole_maskebari_count/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const role_name = req.user.role_name;
    const role_id = req.user.role_id;
    const id = req.params.id;
    console.log( role_name );

    if (
        !(
            ( role_id === 2 && role_name === 'office_admin' ) ||
            ( role_id === 99 && role_name === 'superadmin' )
        )
    ) {
        console.error( `❌ Unauthorized Delete Attempt for Payrole Maskebari Id ${ id }` );
        return res.status( 403 ).json( {
            Status: false,
            message: `You are not authorized to delete. Please contact the administrator.`
        } );
    }


    try {
        const [result] = await pool.query( `DELETE FROM payrole_maskebari WHERE id=?`, [id] );
        res.json( {
            Status: true,
            message: "बन्दी DELETE गरियो।"
        } );
    } catch ( error ) {
        console.error( error );
        res.json( {
            Status: false,
            message: "Something Wrong!"
        } );
    }
} );

router.post( '/create_payrole_log', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_user = req.user.username;

    try {
        req.body.created_by = active_user;
        req.body.current_office_id = active_office;

        // ✅ Clean payload: convert '' to null for optional fields
        const cleanedBody = {
            ...req.body,
            no_hajir_reason: req.body.no_hajir_reason || null,
            no_hajir_mudda: req.body.no_hajir_mudda || null,
            no_hajir_mudda_district: req.body.no_hajir_mudda_district || null,
            no_hajir_reason_office_type: req.body.no_hajir_reason_office_type || null,
            no_hajir_reason_office_id: req.body.no_hajir_reason_office_id || null,
            no_hajir_reason_office_name: req.body.no_hajir_reason_office_name || null,
            no_hajir_is_pratibedan: req.body.no_hajir_is_pratibedan || null,
            no_hajir_is_aadesh: req.body.no_hajir_is_aadesh || null,
        };
        delete cleanedBody.office_bandi_id; // 🔴 Remove unknown field
        delete cleanedBody.office_name; // 🔴 Remove unknown field

        const keys = Object.keys( cleanedBody );
        const values = Object.values( cleanedBody );
        const placeholders = keys.map( () => '?' ).join( ', ' );

        const sql = `INSERT INTO payrole_logs (${ keys.join( ', ' ) }) VALUES (${ placeholders })`;
        const result = await query( sql, values );

        res.status( 201 ).json( { Status: true, Result: result.insertId } );
    } catch ( err ) {
        console.error( 'Error creating payrole log:', err );
        res.status( 500 ).json( { Status: false, Error: err.message } );
    }
} );


router.get( '/get_payrole_logs/:id', verifyToken, async ( req, res ) => {
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;
    const id = req.params.id;

    try {
        const baseQuery = `
                WITH ranked_mudda AS (
            SELECT 
                bmd.*, 
                ROW_NUMBER() OVER (
                PARTITION BY bmd.bandi_id 
                ORDER BY 
                    CASE WHEN bmd.is_last_mudda = true THEN 1 ELSE 2 END,
                -- bmd.mudda_date DESC, -- Or another reliable timestamp
                    bmd.id DESC           -- Fallback tie-breaker
                ) AS rn
            FROM bandi_mudda_details bmd
            )
            SELECT 
            pl.payrole_id, pl.hajir_current_date, pl.hajir_status, 
            pl.hajir_next_date, pl.hajir_office, pl.no_hajir_reason, 
            pl.no_hajir_mudda, pl.no_hajir_mudda_district, 
            pl.no_hajir_reason_office_type, pl.no_hajir_reason_office_id, 
            pl.no_hajir_reason_office_name, pl.no_hajir_is_pratibedan, 
            pl.no_hajir_is_aadesh, pl.hajir_remarks,
            bp.bandi_type, bp.bandi_name, 
            m.mudda_name
            FROM payrole_logs pl
            LEFT JOIN bandi_person bp ON pl.bandi_id = bp.id
            LEFT JOIN ranked_mudda bmd ON pl.bandi_id = bmd.bandi_id AND bmd.rn = 1
            LEFT JOIN muddas m ON bmd.mudda_id = m.id
    `;

        let finalQuery = baseQuery;
        let queryParams = [];
        finalQuery += ` WHERE bp.is_active=1`;
        // Restrict results for lower-level offices (office_id >= 2)
        if ( user_office_id > 2 ) {
            finalQuery += ` AND (p.created_office = '?' OR p.updated_office = '?')`;
            queryParams = [user_office_id, user_office_id];
        }

        // if()

        // console.log(finalQuery)

        const [result] = await pool.query( finalQuery, queryParams );
        // console.log( 'acceptedpayrole', user_office_id );
        if ( !result.length ) {
            return res.json( { Status: false, Error: 'No payrole records found' } );
        }

        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'Error fetching accepted payroles:', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal server error' } );
    }
} );

const getMaskebariQuery = `SELECT 
                        year_bs, 
                        month_bs,
                        MAX(oo.office_name_with_letter_address) AS office_name,
                        MAX(os.office_name_with_letter_address) AS created_office_name,
                        MAX(pm.id) AS id, -- or MIN(id), or NULL if not needed
                        MAX(pm.office_id) AS office_id, -- or NULL
                        SUM(pm.total_decision_count_male) AS total_decision_count_male,
                        SUM(pm.total_decision_count_female) AS total_decision_count_female,
                        SUM(pm.total_decision_count_other) AS total_decision_count_other,
                        SUM(pm.total_decision_count) AS total_decision_count,
                        SUM(pm.total_payrole_count_male) AS total_payrole_count_male,
                        SUM(pm.total_payrole_count_female) AS total_payrole_count_female,
                        SUM(pm.total_payrole_count_other) AS total_payrole_count_other,
                        SUM(pm.total_payrole_count) AS total_payrole_count,
                        SUM(pm.total_no_from_court_count_male) AS total_no_from_court_count_male,
                        SUM(pm.total_no_from_court_count_female) AS total_no_from_court_count_female,
                        SUM(pm.total_no_from_court_count_other) AS total_no_from_court_count_other,
                        SUM(pm.total_no_from_court_count) AS total_no_from_court_count,
                        SUM(pm.total_bhuktan_count_male) AS total_bhuktan_count_male,
                        SUM(pm.total_bhuktan_count_female) AS total_bhuktan_count_female,
                        SUM(pm.total_bhuktan_count_other) AS total_bhuktan_count_other,
                        SUM(pm.total_bhuktan_count) AS total_bhuktan_count,
                        SUM(pm.total_current_payrole_count_male) AS total_current_payrole_count_male,
                        SUM(pm.total_current_payrole_count_female) AS total_current_payrole_count_female,
                        SUM(pm.total_current_payrole_count_other) AS total_current_payrole_count_other,
                        SUM(pm.total_current_payrole_count) AS total_current_payrole_count,
                        SUM(pm.total_in_district_wise_count_male) AS total_in_district_wise_count_male,
                        SUM(pm.total_in_district_wise_count_female) AS total_in_district_wise_count_female,
                        SUM(pm.total_in_district_wise_count_other) AS total_in_district_wise_count_other,
                        SUM(pm.total_in_district_wise_count) AS total_in_district_wise_count,
                        SUM(pm.total_out_district_wise_count_male) AS total_out_district_wise_count_male,
                        SUM(pm.total_out_district_wise_count_female) AS total_out_district_wise_count_female,
                        SUM(pm.total_out_district_wise_count_other) AS total_out_district_wise_count_other,
                        SUM(pm.total_out_district_wise_count) AS total_out_district_wise_count,
                        SUM(pm.total_no_payrole_count_male) AS total_no_payrole_count_male,
                        SUM(pm.total_no_payrole_count_female) AS total_no_payrole_count_female,
                        SUM(pm.total_no_payrole_count_other) AS total_no_payrole_count_other,
                        SUM(pm.total_no_payrole_count) AS total_no_payrole_count,
                        SUM(pm.total_payrole_regulation_female) AS total_payrole_regulation_female,
                        SUM(pm.total_payrole_regulation_male) AS total_payrole_regulation_male,
                        SUM(pm.total_payrole_regulation_other) AS total_payrole_regulation_other,
                        SUM(pm.total_payrole_regulation) AS total_payrole_regulation,
                        GROUP_CONCAT(remarks SEPARATOR '; ') AS remarks
                    FROM payrole_maskebari pm
                    LEFT JOIN offices oo ON pm.office_id = oo.id
                    LEFT JOIN offices os ON pm.created_office = os.id
`;

router.get( '/payrole_maskebari_count', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    let sql = '';
    let params = '';
    try {
        if ( active_office <= 2 ) {
            sql = `${ getMaskebariQuery }                     
                    GROUP BY year_bs, month_bs, office_id
                    ORDER BY year_bs DESC, month_bs;`;
            params = [];
        } else {
            console.log( 'clientRoute' );
            sql = `${ getMaskebariQuery } WHERE created_office=? 
                    GROUP BY year_bs, month_bs, office_id
                    ORDER BY year_bs DESC, month_bs; `;
            params = [active_office];
        }
        const result = await query( sql, params );
        res.status( 200 ).json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'GET Error:', err );
        res.status( 500 ).json( { Status: false, error: err.message } );
    }
} );

router.put( '/create_payrole_maskebari_count/:id', verifyToken, async ( req, res ) => {
    const { id } = req.params;
    const active_office = req.user.office_id;
    const active_user = req.user.username;

    try {
        // Add updated_by and updated_office to the request body
        req.body.updated_by = active_user;
        // req.body.updated_office = active_office;

        const keys = Object.keys( req.body );
        const values = Object.values( req.body );

        const setClause = keys.map( key => `${ key } = ?` ).join( ', ' );
        const sql = `UPDATE payrole_maskebari SET ${ setClause } WHERE id = ?`;

        values.push( id ); // Add ID at the end for WHERE clause

        const result = await query( sql, values );
        res.status( 200 ).json( { message: 'Updated successfully', affectedRows: result.affectedRows } );
    } catch ( err ) {
        console.error( 'Update Error:', err );
        res.status( 500 ).json( { error: err.message } );
    }
} );


router.get( '/get_selected_office/:id', verifyToken, async ( req, res ) => {
    const id = req.params.id;
    try {
        const [result] = await pool.query( `SELECT letter_address FROM offices WHERE id=?`, [id] );
        res.status( 200 ).json( { Status: true, Result: result } );
    } catch ( err ) {
        console.log( err );
        res.status( 500 ).json( { Status: false, error: err.message } );
    }
} );

router.get( '/get_selected_mudda_group/:id', verifyToken, async ( req, res ) => {
    const id = req.params.id;
    try {
        const [result] = await pool.query( `SELECT mudda_group_name FROM muddas_groups WHERE id=?`, [id] );
        res.status( 200 ).json( { Status: true, Result: result } );
    } catch ( err ) {
        console.log( err );
        res.status( 500 ).json( { Status: false, error: err.message } );
    }
} );

router.get( '/get_allowed_statuses', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_role_id = req.user.role_id;
    try {
        const [result] = await pool.query( `
            SELECT ur.id, ur.role_name_np, psr.payrole_status_id, 
            ps.payrole_status_name, ps.status_key, ps.id AS ps_id
            FROM payrole_status_roles psr 
            LEFT JOIN user_roles ur ON psr.role_id=ur.id
            LEFT JOIN payrole_status ps ON psr.payrole_status_id=ps.id
            WHERE psr.role_id=?`
            , [user_role_id] );
        res.status( 200 ).json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'GET Error:', err );
        res.status( 500 ).json( { Status: false, error: err.message } );
    }
} );
router.get( '/get_allowed_actions', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_role_id = req.user.role_id;
    const payrole_status_id = req.query.payrole_status_id;

    try {
        const [result] = await pool.query( `
            SELECT ur.id, ur.role_name_np, psa.payrole_status_id, 
            ps.payrole_status_name, ps.status_key, ps.id AS ps_id
            FROM payrole_status_actions psa 
            LEFT JOIN user_roles ur ON psa.role_id=ur.id
            LEFT JOIN payrole_status ps ON psa.payrole_status_id=ps.id
            WHERE psa.role_id=? AND psa.current_payrole_status_id IS NULL OR psa.current_payrole_status_id=?
            `
            , [user_role_id, payrole_status_id] );
        res.status( 200 ).json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'GET Error:', err );
        res.status( 500 ).json( { Status: false, error: err.message } );
    }
} );
export { router as payroleRouter };