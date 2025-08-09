import express from 'express';
import con from '../utils/db.js';
import pool from '../utils/db3.js';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import NepaliDate from 'nepali-datetime';
import dateConverter from 'nepali-datetime/dateConverter';

import { calculateBSDate } from '../utils/dateCalculator.js';
import verifyToken from '../middlewares/verifyToken.js';


const router = express.Router();
// const query = promisify(con.query).bind(con);
const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );



import NepaliDateConverter from 'nepali-date-converter';
const current_date = new NepaliDate().format( 'YYYY-MM-DD' );
const fy = new NepaliDate().format( 'YYYY' ); //Support for filter
const fy_date = fy + '-04-01';

import { bs2ad } from '../utils/bs2ad.js';
import {
    insertBandiPerson, insertKaidDetails, insertCardDetails, insertAddress,
    insertMuddaDetails, insertFineDetails, insertPunarabedan, insertFamily, insertContacts, insertHealthInsurance,
    insertSingleFineDetails,
    insertDiseasesDetails,
    insertDisablilityDetails,
    updateContactPerson,
    updateDiseasesDetails,
    updateDisabilities,
    insertTransferDetails,
    updateTransferDetails,
    insertTransferRequest
} from '../services/bandiService.js';
// console.log(current_date);
// console.log(fy_date)

//गाडीका विवरणहरुः नाम सुची
// Promisify specific methods
const queryAsync = promisify( con.query ).bind( con );
const beginTransactionAsync = promisify( con.beginTransaction ).bind( con );
const commitAsync = promisify( con.commit ).bind( con );
const rollbackAsync = promisify( con.rollback ).bind( con );
const query = promisify( con.query ).bind( con );

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
        const randId = Math.floor( 1000000 + Math.random() * 9000000 ); // 7-digit random number
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

router.get( '/get_random_bandi_id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const rand_bandi_id = await generateUniqueBandiId();
    const rand_office_bandi_id = active_office + rand_bandi_id;
    console.log( rand_office_bandi_id );
    return res.json( { Status: true, Result: rand_bandi_id } );
} );

//Define storage configuration
const storage = multer.diskStorage( {
    destination: function ( req, file, cb ) {
        const uploadDir = './uploads/bandi_photos';
        // console.log(uploadDir)
        if ( !fs.existsSync( uploadDir ) ) {
            fs.mkdirSync( uploadDir, { recursive: true } );
        }
        cb( null, uploadDir );
    },

    filename: function ( req, file, cb ) {
        const { office_bandi_id, bandi_name } = req.body;
        // if ( !office_bandi_id || !bandi_name ) {
        if ( !office_bandi_id ) {
            return cb( new Error( 'bandi_id and bandi_name are required' ), null );
        }
        const ext = path.extname( file.originalname );
        const dateStr = new Date().toISOString().split( 'T' )[0];
        // const safeName = bandi_name.replace( /\s+/g, '_' ); //sanitize spaces

        // const uniqueName = `${ office_bandi_id }_${ safeName }_${ dateStr }${ ext }`;
        const uniqueName = `${ office_bandi_id }_${ dateStr }${ ext }`;
        cb( null, uniqueName );
    }
} );

// File filter (only images allowed)
const fileFilter = ( req, file, cb ) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|jfif/;
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

pool.query( `CREATE OR REPLACE VIEW view_bandi_address_details AS
SELECT 
    bp.id AS bandi_id,
    ba.wardno,
    ba.bidesh_nagarik_address_details,
    nc.id AS country_id, 
    nc.country_name_np,
    ns.state_id,
    ns.state_name_np,
    nd.did AS district_id,
    nd.district_name_np,
    ng.cid AS city_id,
    ng.city_name_np,

    -- Full Nepali formatted address
    CONCAT_WS(
        ', ',
        ng.city_name_np,
        CONCAT('वडा नं ', ba.wardno),
        nd.district_name_np,
        ns.state_name_np,
        nc.country_name_np
    ) AS nepali_address

FROM bandi_person bp
LEFT JOIN bandi_address ba ON bp.id = ba.bandi_id
LEFT JOIN np_country nc ON ba.nationality_id = nc.id
LEFT JOIN np_state ns ON ba.province_id = ns.state_id
LEFT JOIN np_district nd ON ba.district_id = nd.did
LEFT JOIN np_city ng ON ba.gapa_napa_id = ng.cid;
`);

router.put( '/update_bandi_photo1/:id', verifyToken, upload.single( 'photo' ), async ( req, res ) => {
    let connection;
    const bandi_id = req.params.id;
    const { bandi_name, office_bandi_id } = req.body;
    const photoFile = req.file;
    const photo_path = photoFile ? `/uploads/bandi_photos/${ photoFile.filename }` : null;

    if ( !photoFile || !bandi_name || !office_bandi_id ) {
        return res.status( 400 ).json( { success: false, message: 'Missing required fields' } );
    }

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Fetch old photo
        const [result] = await connection.query(
            `SELECT photo_path FROM bandi_person WHERE id = ?`,
            [bandi_id]
        );
        const oldPhotoPath = result?.[0]?.photo_path;

        // Update photo
        await connection.query(
            `UPDATE bandi_person SET photo_path = ? WHERE id = ?`,
            [photo_path, bandi_id]
        );
        await connection.commit();
        if ( oldPhotoPath ) {
            const oldPath = path.join( '.', oldPhotoPath );
            try {
                await fs.promises.access( oldPath );
                await fs.promises.unlink( oldPath );
                console.log( `🗑️ Old photo deleted: ${ oldPath }` );
            } catch ( unlinkErr ) {
                console.warn( `⚠️ Could not delete old photo (${ oldPath }):`, unlinkErr.message );
            }
        }
        res.status( 200 ).json( {
            success: true,
            message: 'फोटो सफलतापूर्वक अपडेट भयो',
            photo_path
        } );
    } catch ( err ) {
        if ( connection ) {
            try {
                await connection.rollback();

                // Set photo_path = NULL for that specific bandi
                await pool.query(
                    `UPDATE bandi_person SET photo_path = NULL WHERE id = ?`,
                    [bandi_id] // make sure you have bandiId defined from context
                );
            } catch ( rollbackErr ) {
                console.error( "⚠️ Rollback or cleanup failed:", rollbackErr );
            } finally {
                connection.release();
            }
        }
        if ( photoFile ) {
            const uploadedPath = photoFile.path;
            try {
                await fs.promises.access( uploadedPath );
                await fs.promises.unlink( uploadedPath );
                console.log( `🗑️ Uploaded photo deleted due to error` );
            } catch {
                console.warn( '⚠️ Uploaded photo already missing' );
            }
            // Optional: cleanup DB in case path was saved before error
            try {
                await pool.query( 'UPDATE bandi_person SET photo_path = NULL WHERE id = ?', [bandi_id] );
                console.log( '📛 photo_path set to NULL after failed upload' );
            } catch ( dbErr ) {
                console.error( '❌ Failed to reset photo_path to NULL:', dbErr );
            }
        }

        console.error( "❌ Update transaction failed:", err );
        res.status( 500 ).json( {
            success: false,
            message: "फोटो अपडेट असफल भयो",
            error: err.message,
        } );

    } finally {
        if ( connection ) connection.release();
    }
} );

router.put( '/update_bandi_photo/:id', verifyToken, upload.single( 'photo' ), async ( req, res ) => {
    let connection;
    const bandi_id = req.params.id;
    const { bandi_name, office_bandi_id } = req.body;
    const photoFile = req.file;
    const photo_path = photoFile ? `/uploads/bandi_photos/${ photoFile.filename }` : null;

    if ( !photoFile || !bandi_name || !office_bandi_id ) {
        return res.status( 400 ).json( { success: false, message: 'Missing required fields' } );
    }

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Fetch old photo
        const [result] = await connection.query(
            'SELECT photo_path FROM bandi_person WHERE id = ?',
            [bandi_id]
        );
        const oldPhotoPath = result?.[0]?.photo_path;

        // Delete old photo from disk (if exists)
        if ( oldPhotoPath ) {
            const oldPath = path.join( '.', oldPhotoPath );
            try {
                await fs.promises.access( oldPath );
                await fs.promises.unlink( oldPath );
                await pool.query( 'UPDATE bandi_person SET photo_path = NULL WHERE id = ?', [bandi_id] );
                console.log( `🗑️ Old photo deleted: ${ oldPath }` );
            } catch ( unlinkErr ) {
                console.warn( `⚠️ Could not delete old photo (${ oldPath }):`, unlinkErr.message );
            }
        }

        // Update photo path in DB
        await connection.query(
            'UPDATE bandi_person SET photo_path = ? WHERE id = ?',
            [photo_path, bandi_id]
        );
        await connection.commit();



        res.status( 200 ).json( {
            success: true,
            message: 'फोटो सफलतापूर्वक अपडेट भयो',
            photo_path,
        } );
    } catch ( err ) {
        console.error( '❌ Update transaction failed:', err );

        // Cleanup if error occurred
        if ( connection ) {
            try {
                await connection.rollback();
            } catch ( rollbackErr ) {
                console.error( '⚠️ Rollback failed:', rollbackErr );
            } finally {
                connection.release();
            }
        }

        // Delete newly uploaded photo if it exists
        if ( photoFile ) {
            const uploadedPath = photoFile.path;
            try {
                await fs.promises.access( uploadedPath );
                await fs.promises.unlink( uploadedPath );
                console.log( '🗑️ Uploaded photo deleted due to error' );
            } catch {
                console.warn( '⚠️ Uploaded photo already missing' );
            }

            // Set photo_path = NULL in DB if it was inserted before failure
            try {
                await pool.query( 'UPDATE bandi_person SET photo_path = NULL WHERE id = ?', [bandi_id] );
                console.log( '📛 photo_path reset to NULL due to error' );
            } catch ( dbErr ) {
                console.error( '❌ Failed to reset photo_path to NULL:', dbErr );
            }
        }

        res.status( 500 ).json( {
            success: false,
            message: 'फोटो अपडेट असफल भयो',
            error: err.message,
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.post( '/create_bandi', verifyToken, upload.single( 'photo' ), async ( req, res ) => {
    const user_id = req.user.username;
    const office_id = req.user.office_id;
    const photo_path = req.file ? `/uploads/bandi_photos/${ req.file.filename }` : null;
    const data = req.body;
    const office_bandi_id = data.office_bandi_id;
    let connection;
    const c_user_id = Number( user_id );
    if ( isNaN( c_user_id ) ) {
        console.error( "❌ Old Id Used!!!" );
        return res.status( 500 ).json( {
            Status: false,
            message: `कृपया नयाँ ID प्रयोग गर्नुहोला । ${ req.params.c_user_id } निष्कृय गरिएको छ !!!`
        } );
    }

    try {
        // ✅ get a dedicated connection from the pool
        connection = await pool.getConnection();

        await connection.beginTransaction();
        console.log( `🟢 Transaction started by ${ req.user.office_np }` );

        const [chk_bandi_id_duplicate] = await connection.query(
            `SELECT office_bandi_id FROM bandi_person WHERE office_bandi_id = ?`,
            [office_bandi_id]
        );
        if ( chk_bandi_id_duplicate.length > 0 ) {
            return res.status( 409 ).json( {
                Status: false,
                message: `Bandi ID ${ office_bandi_id } already exists !!!`
            } );
        }

        const bandi_id = await insertBandiPerson( { ...req.body, user_id, office_id, photo_path }, connection );
        await insertKaidDetails( bandi_id, { ...req.body, user_id, office_id }, connection );
        await insertCardDetails( bandi_id, { ...req.body, user_id, office_id }, connection );
        await insertAddress( bandi_id, { ...req.body, user_id, office_id }, connection );

        const muddaIndexes = [...new Set( Object.keys( req.body ).filter( k => k.startsWith( 'mudda_id_' ) ).map( k => k.split( '_' )[2] ) )];
        const muddas = muddaIndexes.map( i => ( {
            mudda_id: req.body[`mudda_id_${ i }`],
            mudda_no: req.body[`mudda_no_${ i }`],
            is_last: req.body[`is_last_mudda_${ i }`],
            is_main: req.body[`is_main_mudda_${ i }`],
            hirasat_years: req.body[`hirasat_years_${ i }`],
            hirasat_months: req.body[`hirasat_months_${ i }`],
            hirasat_days: req.body[`hirasat_days_${ i }`],
            total_kaid_duration: req.body[`total_kaid_duration_${ i }`],
            thuna_date_bs: req.body[`thuna_date_bs_${ i }`],
            release_date_bs: req.body[`release_date_bs_${ i }`],
            is_life_time: req.body[`is_life_time_${ i }`],
            condition: req.body[`mudda_condition_${ i }`],
            district: req.body[`mudda_district_${ i }`],
            office: req.body[`mudda_office_${ i }`],
            date: req.body[`mudda_phesala_date_${ i }`],
            vadi: req.body[`vadi_${ i }`],
        } ) );
        // console.log( 'muddas', muddas );
        await insertMuddaDetails( bandi_id, muddas, user_id, office_id, connection );

        const fineArray = JSON.parse( req.body.fine || '[]' );
        await insertFineDetails( bandi_id, fineArray, user_id, office_id, connection );

        if ( data.punarabedan_office_id && data.punarabedan_office_district &&
            data.punarabedan_office_ch_no && data.punarabedan_office_date ) {
            await insertPunarabedan( bandi_id, req.body, connection );
        }

        await insertFamily( bandi_id, JSON.parse( req.body.family || '[]' ), user_id, office_id, connection );
        await insertContacts( bandi_id, JSON.parse( req.body.conatact_person || '[]' ), user_id, office_id, connection );
        await insertDiseasesDetails( bandi_id, JSON.parse( req.body.disease || '[]' ), user_id, office_id, connection );
        await insertDisablilityDetails( bandi_id, JSON.parse( req.body.disability || '[]' ), user_id, office_id, connection );
        if ( data.health_insurance?.length ) {
            await insertHealthInsurance( bandi_id, [{ ...req.body }], user_id, office_id, connection );
        }
        await connection.commit();
        console.log( `🟩 Transaction committed with Bandi ID ${ bandi_id } by ${ req.user.office_np }` );
        connection.release();
        res.json( {
            Status: true,
            Result: bandi_id,
            message: 'बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।'
        } );
    } catch ( error ) {
        console.error( '❌ Error during /create_bandi:', error );
        if ( connection ) {
            try {
                await connection.rollback();
                console.log( '🔄 Transaction rolled back' );
            } catch ( rollbackErr ) {
                console.error( '❌ Rollback failed:', rollbackErr );
            }
        }
        // If photo uploaded, delete it
        if ( req.file ) {
            const photoFullPath = path.join( __dirname, '..', 'uploads', 'bandi_photos', req.file.filename );
            try {
                await fs.promises.unlink( photoFullPath );
                console.log( '🗑️ Photo deleted due to error' );

                // If bandi_id exists, update photo_path to NULL
                if ( bandi_id ) {
                    await pool.query( `UPDATE bandi_person SET photo_path = NULL WHERE id = ?`, [bandi_id] );
                    console.log( `📛 photo_path set to NULL for bandi_id ${ bandi_id }` );
                }
            } catch ( unlinkErr ) {
                console.error( '❌ Failed to delete photo or update DB:', unlinkErr );
            }
        }
        res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: 'त्रुटि भयो। विवरण सुरक्षित हुन सकेन।',
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.post( '/create_bandi_punrabedn', verifyToken, async ( req, res ) => {
    let connection;
    const user_id = req.user.username;
    const current_office_id = req.user.office_id;

    const {
        bandi_id,
        punarabedan_office_id,
        punarabedan_office_name,
        punarabedan_office_district,
        punarabedan_office_ch_no,
        punarabedan_office_date
    } = req.body;

    // Basic validation
    if ( !bandi_id || !punarabedan_office_id || !punarabedan_office_ch_no || !punarabedan_office_date ) {
        return res.status( 400 ).json( {
            Status: false,
            message: "सबै आवश्यक फिल्डहरू भरिएको हुनुपर्छ।"
        } );
    }

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const insertQuery = `
      INSERT INTO bandi_punarabedan_details (
        bandi_id,
        punarabedan_office_id,
        punarabedan_office_name,
        punarabedan_office_district,
        punarabedan_office_ch_no,
        punarabedan_office_date,
        created_by,
        updated_by,
        current_office_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            bandi_id,
            punarabedan_office_id,
            punarabedan_office_name || null,
            punarabedan_office_district,
            punarabedan_office_ch_no,
            punarabedan_office_date,
            user_id,
            user_id,
            current_office_id
        ];

        await connection.query( insertQuery, values );

        await connection.commit();

        res.json( {
            Status: true,
            message: "पुनरावेदन विवरण सफलतापूर्वक थपियो।"
        } );

    } catch ( error ) {
        if ( connection ) await connection.rollback();

        console.error( "Insert failed:", error );
        res.status( 500 ).json( {
            Status: false,
            message: "सर्भर त्रुटि भयो।",
            Error: error.message
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );


router.post( '/create_bandi_fine', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const data = req.body;

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // ✅ Use the connection inside the helper
        await insertSingleFineDetails( data.bandi_id, data, user_id, active_office, connection );

        await connection.commit();

        res.json( {
            Result: data.bandi_id,
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        if ( connection ) await connection.rollback();
        console.error( "Transaction failed:", error );

        res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

// bfd.fine_type, bfd.amount_fixed, bfd.amount_deposited, bfdo.office_name_with_letter_address AS deposited_office, bfdnd.district_name_np AS deposited_district,
// bfd.deposit_ch_no, bfd.deposit_date, bfd.deposit_amount

//  -- Payrole
//     p.id AS payrole_id,
//     p.payrole_reason,
//     p.other_details,
//     p.remark,
//     p.status AS payrole_status,
//     p.user_id,
//     p.created_office,
//     p.payrole_no_id,
//     p.payrole_entery_date,
//     pr.dopmremark,
//     pr.pyarole_rakhan_upayukat,
//     pr.is_checked,
//     po.office_name_with_letter_address AS current_payrole_office,
const getBandiQuery = `
    SELECT 
    b.id AS bandi_id,
    b.office_bandi_id,
    b.lagat_no,
    b.bandi_name,
    b.bandi_type,
    b.gender,
    b.dob,
    b.dob_ad,
    TIMESTAMPDIFF(YEAR, b.dob_ad, CURDATE()) AS current_age,
    b.status AS bandi_status,
    b.bandi_education,
    b.bandi_huliya,
    b.married_status,
    b.photo_path,
    b.is_active,
    b.remarks,

    -- Address
    ba.wardno,
    ba.bidesh_nagarik_address_details,
    nc.country_name_np,
    ns.state_name_np,
    nd.district_name_np,
    nci.city_name_np,

    -- Mudda Details
    bmd.mudda_no,
    bmd.mudda_id,
    bmd.vadi,
    bmd.mudda_condition,
    bmd.mudda_phesala_antim_office_date,
    bmd.is_main_mudda,
    m.mudda_name,

    -- Kaid Details
    bkd.hirasat_years,
    bkd.hirasat_months,
    bkd.hirasat_days,
    bkd.thuna_date_bs,
    bkd.release_date_bs,

    -- Punarabedan Details
    bpdo.office_name_with_letter_address,
    bpd.punarabedan_office_ch_no,
    bpd.punarabedan_office_date,

   

    -- Fine Summary
    fine_summary_table.fine_summary

FROM bandi_person b

LEFT JOIN bandi_address ba ON b.id = ba.bandi_id
LEFT JOIN np_country nc ON ba.nationality_id = nc.id
LEFT JOIN np_state ns ON ba.province_id = ns.state_id
LEFT JOIN np_district nd ON ba.district_id = nd.did
LEFT JOIN np_city nci ON ba.gapa_napa_id = nci.cid

LEFT JOIN bandi_mudda_details bmd ON b.id = bmd.bandi_id AND bmd.is_main_mudda = 1
LEFT JOIN muddas m ON bmd.mudda_id = m.id

LEFT JOIN bandi_kaid_details bkd ON b.id = bkd.bandi_id

LEFT JOIN bandi_punarabedan_details bpd ON b.id = bpd.bandi_id
LEFT JOIN offices bpdo ON bpd.punarabedan_office_id = bpdo.id

-- LEFT JOIN payroles p ON b.id = p.bandi_id
-- LEFT JOIN offices po ON p.created_office = po.id
-- LEFT JOIN payrole_reviews pr ON p.id=pr.payrole_id
-- LEFT JOIN payrole_decisions pd ON p.id=pd.payrole_id

-- Fine Summary Subquery
LEFT JOIN (
    SELECT 
        bandi_id,
        GROUP_CONCAT(
          DISTINCT CONCAT(
            fine_type, ': ', 
            amount_fixed, ' (तिरेको: ', 
            IFNULL(amount_deposited, '0'), 
            ', च.नं.: ', IFNULL(deposit_ch_no, 'N/A'), 
            ', कार्यालय: ', IFNULL(deposit_office, 'N/A'), 
            ')'
          ) 
          ORDER BY fine_type
          SEPARATOR ' | '
        ) AS fine_summary
    FROM bandi_fine_details bfd 
    LEFT JOIN offices bfdo ON bfdo.id=bfd.deposit_office 
    GROUP BY bandi_id
) AS fine_summary_table ON fine_summary_table.bandi_id = b.id

WHERE b.is_active = 1
`;

router.get( '/get_bandi', async ( req, res ) => {
    pool.query( getBandiQuery, ( err, result ) => {
        if ( err ) return res.json( { Status: false, Error: "Query Error" } );
        return res.json( { Status: true, Result: result } );
    } );
} );

router.get( '/get_bandi/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `${ getBandiQuery } AND b.id =? `;
    try {
        const [result] = await pool.query( sql, id );
        // console.log(result)
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_bandi1/:id', async ( req, res ) => {
    const { id } = req.params;
    console.log( 'Fetching bandi with ID:', id );
    const sql = `${ getBandiQuery } AND b.id =? `;
    pool.query( sql, [id], ( err, result ) => {
        // console.log(result)
        if ( err ) {
            console.error( 'Query Error:', err );
            return res.json( { Status: false, Error: "Query Error" } );
        }
        return res.json( { Status: true, Result: result } );
    } );
} );

router.get( '/get_all_office_bandi', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const selectedOffice = req.query.selected_office || 0;
    // const forSelect = req.query.forSelect || 0;
    const forSelect = req.query.forSelect === 'true' || req.query.forSelect === '1';
    // console.log( 'forSelect', forSelect );
    const searchOffice = req.query.searchOffice || 0;
    const nationality = req.query.nationality || 0;
    const gender = req.query.gender || 0;
    const bandi_type = req.query.bandi_type || 0;
    const search_name = req.query.search_name || 0;
    const is_active = req.query.is_active || 1; // Default to 1 (active)
    const mudda_group_id = req.query.mudda_group_id || '';
    // const page = parseInt( req.query.page ) || 0;
    // const limit = parseInt( req.query.limit ) || 25;
    // const offset = page * limit;

    let baseWhere = '';
    // console.log(search_name)

    if ( selectedOffice ) {
        baseWhere += ` WHERE bp.current_office_id=${ selectedOffice }`;
    } else {
        if ( searchOffice ) {
            baseWhere = `WHERE bp.current_office_id = ${ searchOffice }`;
        } else if ( active_office == 1 || active_office == 2 ) {
            baseWhere = `WHERE 1=1`;
        } else {
            baseWhere = `WHERE bp.current_office_id = ${ active_office }`;
        }
    }
    if ( nationality ) {
        // console.log(nationality)
        if ( baseWhere ) {
            baseWhere += ` AND bp.nationality = '${ nationality }'`;  // Note quotes for string
        } else {
            baseWhere = `WHERE bp.nationality = '${ nationality }'`;
        }
    }
    if ( mudda_group_id ) {
        const escapedGroupId = con.escape( mudda_group_id );
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
    if ( gender ) {
        if ( baseWhere ) {
            baseWhere += ` AND bp.gender='${ gender }'`;
        } else {
            baseWhere += `WHERE bp.gender='${ gender }'`;
        }
    }
    if ( bandi_type ) {
        if ( baseWhere ) {
            baseWhere += ` AND bp.bandi_type='${ bandi_type }'`;
        } else {
            baseWhere += `WHERE bp.bandi_type='${ bandi_type }'`;
        }
    }

    if ( search_name ) {
        const escapedName = con.escape( `%${ search_name }%` );
        baseWhere += ` AND (bp.bandi_name LIKE ${ escapedName } OR bp.office_bandi_id = ${ con.escape( search_name ) })`;
    }

    baseWhere += ` AND bp.is_active= ${ is_active } `;
    if ( forSelect ) {
        baseWhere += ` AND bp.is_active= ${ is_active }`;
    }

    try {
        // STEP 1: Get paginated bandi IDs
        let idQuery = `SELECT bp.id FROM bandi_person bp ${ baseWhere } ORDER BY bp.id DESC`;
        let idRows;

        // if ( forSelect ) {
        //     [idRows] = await pool.query( idQuery );
        // } else {
        //     idQuery += ` LIMIT ? OFFSET ?`;
        //     [idRows] = await pool.query( idQuery, [limit, offset] );
        // }
        [idRows] = await pool.query( idQuery );

        const bandiIds = idRows.map( row => row.id );
        if ( bandiIds.length === 0 ) {
            return res.json( { Status: true, Result: [], TotalCount: 0 } );
        }

        // STEP 2: Get total count
        const countSQL = `SELECT COUNT(*) AS total FROM bandi_person bp ${ baseWhere }`;
        const [countResult] = await pool.query( countSQL );
        const totalCount = countResult[0].total;

        // STEP 3: Get full records for selected bandis
        const placeholders = bandiIds.map( () => '?' ).join( ',' );
        const fullQuery = `
            SELECT 
                bp.id AS bandi_id,
                bp.*,
                TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) AS current_age,
                ba.wardno,
                ba.bidesh_nagarik_address_details,
                nc.country_name_np,
                ns.state_name_np,
                nd.district_name_np,
                nci.city_name_np,
                bmd_combined.mudda_id,
                bmd_combined.mudda_name,
                bmd_combined.is_main_mudda,
                bmd_combined.is_last_mudda,
                bmd_combined.office_name_with_letter_address,
                bmd_combined.vadi,
                bmd_combined.mudda_phesala_antim_office_date,
                bmd_combined.mudda_group_id,
                bmd_combined.mudda_group_name,
                bkd.hirasat_years, bkd.hirasat_months, bkd.hirasat_days,
                bkd.thuna_date_bs, bkd.release_date_bs,
                oo.letter_address AS current_office_letter_address,
                brd_combined.last_karnayan_miti
            FROM bandi_person bp
            LEFT JOIN bandi_address ba ON bp.id = ba.bandi_id
            LEFT JOIN np_country nc ON ba.nationality_id = nc.id
            LEFT JOIN np_state ns ON ba.province_id = ns.state_id
            LEFT JOIN np_district nd ON ba.district_id = nd.did
            LEFT JOIN np_city nci ON ba.gapa_napa_id = nci.cid
            LEFT JOIN bandi_kaid_details bkd ON bp.id=bkd.bandi_id
            LEFT JOIN offices oo ON bp.current_office_id = oo.id
            LEFT JOIN (
                SELECT 
                    bmd.bandi_id, bmd.mudda_id, bmd.is_main_mudda,
                    bmd.is_last_mudda, m.mudda_name, bmd.vadi,
                    bmd.mudda_phesala_antim_office_date,
                    o.office_name_with_letter_address,
                    mg.mudda_group_name, mg.id AS mudda_group_id
                FROM bandi_mudda_details bmd
                LEFT JOIN muddas m ON bmd.mudda_id = m.id
                LEFT JOIN offices o ON bmd.mudda_phesala_antim_office_name = o.id
                LEFT JOIN muddas_groups mg ON m.muddas_group_id=mg.id                
            ) AS bmd_combined ON bp.id = bmd_combined.bandi_id
             LEFT JOIN (
             SELECT brd.bandi_id, MAX(brd.karnayan_miti) AS last_karnayan_miti
             FROM bandi_release_details brd  
             GROUP BY bandi_id         
             ) AS brd_combined ON bp.id=brd_combined.bandi_id
            WHERE bp.id IN (${ placeholders })
            ORDER BY bp.id DESC
        `;
        const [fullRows] = await pool.query( fullQuery, bandiIds );

        // STEP 4: Group muddas under each bandi
        const grouped = {};
        fullRows.forEach( row => {
            const {
                bandi_id,
                mudda_id,
                mudda_name,
                is_main_mudda,
                is_last_mudda,
                office_name_with_letter_address,
                vadi,
                mudda_phesala_antim_office_date,
                mudda_group_name,
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
                    mudda_name,
                    is_main_mudda,
                    is_last_mudda,
                    office_name_with_letter_address,
                    vadi,
                    mudda_phesala_antim_office_date,
                    mudda_group_name
                } );
            }
        } );
        // console.log( Object.values( grouped ) );
        return res.json( {
            Status: true,
            Result: Object.values( grouped ),
            TotalCount: totalCount
        } );
    } catch ( err ) {
        console.error( 'Query Error:', err );
        return res.json( { Status: false, Error: 'Query Error' } );
    }
} );

router.get( '/get_all_office_bandi/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const selectedOffice = req.query.selected_office || 0;
    const id = req.params.id;
    console.log( 'id', id );
    // const forSelect = req.query.forSelect || 0;
    const forSelect = req.query.forSelect === 'true' || req.query.forSelect === '1';
    // console.log( 'forSelect', forSelect );
    const searchOffice = req.query.searchOffice || 0;
    const nationality = req.query.nationality || 0;
    const search_name = req.query.search_name || 0;
    const page = parseInt( req.query.page ) || 0;
    const limit = parseInt( req.query.limit ) || 25;
    const offset = page * limit;

    let baseWhere = '';
    // console.log(search_name)

    if ( selectedOffice ) {
        baseWhere += ` WHERE bp.current_office_id= '${ selectedOffice }'`;
    } else {
        if ( searchOffice ) {
            baseWhere = `WHERE bp.current_office_id = '${ searchOffice }'`;
        } else if ( active_office == 1 || active_office == 2 ) {
            baseWhere = `WHERE 1=1`;
        } else {
            baseWhere = `WHERE bp.current_office_id = '${ active_office }'`;
        }
    }
    if ( nationality ) {
        // console.log(nationality)
        if ( baseWhere ) {
            baseWhere += ` AND bp.nationality = '${ nationality }'`;  // Note quotes for string
        } else {
            baseWhere = `WHERE bp.nationality = '${ nationality }'`;
        }
    }

    if ( search_name ) {
        const escapedName = con.escape( `%${ search_name }%` );
        baseWhere += ` AND (bp.bandi_name LIKE ${ escapedName } OR bp.office_bandi_id = ${ con.escape( search_name ) })`;
    }

    baseWhere += ` AND bp.is_active=1 `;
    if ( forSelect ) {
        baseWhere += ` AND bp.is_active=1 `;
    }

    if ( id ) {
        baseWhere += ` AND bp.id= '${ id }'`;
    }

    try {
        // STEP 1: Get paginated bandi IDs
        let idQuery = `SELECT bp.id FROM bandi_person bp ${ baseWhere } ORDER BY bp.id DESC`;
        let idRows;

        if ( forSelect ) {
            [idRows] = await pool.query( idQuery );
        } else {
            idQuery += ` LIMIT ? OFFSET ?`;
            [idRows] = await pool.query( idQuery, [limit, offset] );
        }

        const bandiIds = idRows.map( row => row.id );
        if ( bandiIds.length === 0 ) {
            return res.json( { Status: true, Result: [], TotalCount: 0 } );
        }

        // STEP 2: Get total count
        const countSQL = `SELECT COUNT(*) AS total FROM bandi_person bp ${ baseWhere }`;
        const [countResult] = await pool.query( countSQL );
        const totalCount = countResult[0].total;

        // STEP 3: Get full records for selected bandis
        const placeholders = bandiIds.map( () => '?' ).join( ',' );
        const fullQuery = `
            SELECT 
                bp.id AS bandi_id,
                bp.*,
                TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) AS current_age,
                ba.wardno,
                ba.bidesh_nagarik_address_details,
                nc.country_name_np,
                ns.state_name_np,
                nd.district_name_np,
                nci.city_name_np,
                bmd_combined.mudda_id,
                bmd_combined.mudda_name,
                bmd_combined.is_main_mudda,
                bmd_combined.is_last_mudda,
                bmd_combined.office_name_with_letter_address,
                bmd_combined.vadi,
                bmd_combined.mudda_phesala_antim_office_date,
                bkd.hirasat_years, bkd.hirasat_months, bkd.hirasat_days,
                bkd.thuna_date_bs, bkd.release_date_bs

            FROM bandi_person bp
            LEFT JOIN bandi_address ba ON bp.id = ba.bandi_id
            LEFT JOIN np_country nc ON ba.nationality_id = nc.id
            LEFT JOIN np_state ns ON ba.province_id = ns.state_id
            LEFT JOIN np_district nd ON ba.district_id = nd.did
            LEFT JOIN np_city nci ON ba.gapa_napa_id = nci.cid
            LEFT JOIN bandi_kaid_details bkd ON bp.id=bkd.bandi_id            
            LEFT JOIN (
            SELECT bth.bandi_id, 
                    bth.transfer_from_office_id, 
                    bth.recommended_to_office_id, 
                    bth.final_to_office_id, 
                    bth.transfer_from_date, 
                    bth.transfer_to_date, 
                    bth.transfer_reason_id, 
                    bth.remarks
                FROM bandi_transfer_history bth
                    LEFT JOIN bandi_transfer_reasons btr ON bth.transfer_reason_id=btr.id                    
                    ) AS bth_combined ON bp.id = bth_combined.bandi_id
            LEFT JOIN (
                SELECT 
                    bmd.bandi_id,
                    bmd.mudda_id,
                    bmd.is_main_mudda,
                    bmd.is_last_mudda,
                    m.mudda_name,
                    bmd.vadi,
                    bmd.mudda_phesala_antim_office_date,
                    o.office_name_with_letter_address
                FROM bandi_mudda_details bmd
                LEFT JOIN muddas m ON bmd.mudda_id = m.id
                LEFT JOIN offices o ON bmd.mudda_phesala_antim_office_name = o.id
            ) AS bmd_combined ON bp.id = bmd_combined.bandi_id
            WHERE bp.id IN (${ placeholders })
            ORDER BY bp.id DESC
        `;
        const [fullRows] = await pool.query( fullQuery, bandiIds );

        // STEP 4: Group muddas under each bandi
        const grouped = {};
        fullRows.forEach( row => {
            const {
                bandi_id,
                mudda_id,
                mudda_name,
                is_main_mudda,
                is_last_mudda,
                office_name_with_letter_address,
                vadi,
                mudda_phesala_antim_office_date,
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
                    mudda_name,
                    is_main_mudda,
                    is_last_mudda,
                    office_name_with_letter_address,
                    vadi,
                    mudda_phesala_antim_office_date
                } );
            }
        } );
        // console.log( Object.values( grouped ) );
        return res.json( {
            Status: true,
            Result: Object.values( grouped ),
            TotalCount: totalCount
        } );
    } catch ( err ) {
        console.error( 'Query Error:', err );
        return res.json( { Status: false, Error: 'Query Error' } );
    }
} );

router.get( '/get_bandi_name_for_select', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    // console.log(active_office)    
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

router.get( '/get_bandi_name_for_select/:id', async ( req, res ) => {
    const { id } = req.params;
    console.log( id );
    const sql = `
        SELECT 
                bp.id AS bandi_id,
                bp.*,
                TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) AS current_age,
                ba.wardno,
                ba.bidesh_nagarik_address_details,
                nc.country_name_np,
                ns.state_name_np,
                nd.district_name_np,
                nci.city_name_np,
                bmd_combined.mudda_id,
                bmd_combined.mudda_name,
                bmd_combined.is_main_mudda,
                bmd_combined.is_last_mudda,
                bmd_combined.office_name_with_letter_address,
                bmd_combined.vadi,
                bmd_combined.mudda_phesala_antim_office_date,
                bkd.hirasat_years, bkd.hirasat_months, bkd.hirasat_days,
                bkd.thuna_date_bs, bkd.release_date_bs,
                p.id AS payrole_id,
                p.status,
                p.status AS payrole_status,
                pr.id AS pr_id,
                pr.is_checked,
                pr.pyarole_rakhan_upayukat,
                pr.dopmremark,
                pm.mudda_name

            FROM bandi_person bp
            LEFT JOIN bandi_address ba ON bp.id = ba.bandi_id
            LEFT JOIN np_country nc ON ba.nationality_id = nc.id
            LEFT JOIN np_state ns ON ba.province_id = ns.state_id
            LEFT JOIN np_district nd ON ba.district_id = nd.did
            LEFT JOIN np_city nci ON ba.gapa_napa_id = nci.cid
            LEFT JOIN bandi_kaid_details bkd ON bp.id = bkd.bandi_id
            LEFT JOIN payroles p ON bp.id = p.bandi_id
            LEFT JOIN payrole_reviews pr ON p.id=pr.payrole_id
            LEFT JOIN muddas pm ON p.payrole_mudda_id=pm.id
            LEFT JOIN (
                SELECT 
                    bmd.bandi_id,
                    bmd.mudda_id,
                    bmd.is_main_mudda,
                    bmd.is_last_mudda,
                    m.mudda_name,
                    bmd.vadi,
                    bmd.mudda_phesala_antim_office_date,
                    o.office_name_with_letter_address
                FROM bandi_mudda_details bmd
                LEFT JOIN muddas m ON bmd.mudda_id = m.id
                LEFT JOIN offices o ON bmd.mudda_phesala_antim_office_name = o.id
            ) AS bmd_combined ON bp.id = bmd_combined.bandi_id
            WHERE bp.id IN (${ placeholders })
            ORDER BY bp.id DESC
            `;
    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log('id', result)

        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi not found for select" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.get( '/get_selected_bandi/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT b.*, bmd.*, m.mudda_name 
        FROM bandi_person b
        LEFT JOIN bandi_mudda_details bmd ON b.id = bmd.bandi_id 
        LEFT JOIN muddas m ON bm.mudda_id = m.id
        WHERE b.id = ? AND bmd.is_main = 1
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

router.get( '/get_bandi_address/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT 
            ba.id,
            bp.id AS bandi_id,
            ba.wardno,
            ba.bidesh_nagarik_address_details,
            nc.id AS country_id, 
            nc.country_name_np,
            ns.state_id,
            ns.state_name_np,
            nd.did AS district_id,
            nd.district_name_np,
            ng.cid AS city_id,
            ng.city_name_np,
            CONCAT_WS(
                ', ',
                ng.city_name_np,
                CONCAT('वडा नं ', ba.wardno),
                nd.district_name_np,
                ns.state_name_np,
                nc.country_name_np
            ) AS nepali_address
        FROM bandi_person bp
        LEFT JOIN bandi_address ba ON bp.id = ba.bandi_id
        LEFT JOIN np_country nc ON ba.nationality_id = nc.id
        LEFT JOIN np_state ns ON ba.province_id = ns.state_id
        LEFT JOIN np_district nd ON ba.district_id = nd.did
        LEFT JOIN np_city ng ON ba.gapa_napa_id = ng.cid
        WHERE bp.id = ?
    `;

    try {
        console.log( "🔍 Getting bandi address for ID:", id );
        const [result] = await pool.query( sql, [id] );

        if ( !result || result.length === 0 ) {
            return res.status( 404 ).json( { Status: false, Error: "Bandi Address not found" } );
        }

        return res.status( 200 ).json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "❌ Error in /get_bandi_address:", err );
        return res.status( 500 ).json( { Status: false, Error: "Query Error" } );
    }
} );


router.put( '/update_bandi/:id', verifyToken, async ( req, res ) => {
    const { id } = req.params;
    const data = req.body;
    const dob_ad = await bs2ad( data.dob );
    console.log( dob_ad );
    try {
        const [result] = await pool.query( `
            UPDATE bandi_person SET                
                bandi_name = ?, lagat_no=?, gender = ?, dob = ?, dob_ad=?, married_status = ?,
                bandi_education = ?, height = ?, weight = ?, bandi_huliya = ?, remarks = ?,
                updated_by = ?, updated_at = NOW()
            WHERE id = ?
        `, [
            data.bandi_name, data.lagat_no, data.gender, data.dob, dob_ad, data.married_status,
            data.bandi_education, data.height, data.weight, data.bandi_huliya, data.remarks,
            req.user.username, id
        ] );
        console.log( result );
        res.json( { Status: true, message: "Updated successfully" } );
    } catch ( error ) {
        console.error( error );
        res.status( 500 ).json( { Status: false, message: "Server error", error: error.message } );
    }
} );

router.delete( '/delete_bandi/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const role_name = req.user.role_name;
    const role_id = req.user.role_id;
    const id = req.params.id;
    console.log( role_name );

    if ( role_id !== 99 && role_name !== 'superadmin' ) {
        console.error( `Unauthorized Delete Trial for Bandi Id ${ id }` );
        return res.status( 403 ).json( {
            Status: false,
            message: `You are not authorized to delete. Please contact administrator.`
        } );
    }

    try {
        const [result] = await pool.query( `DELETE FROM bandi_person WHERE id=?`, [id] );
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

router.put( '/update_bandi_address/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const id = req.params.id;

    const {
        bandi_id,
        nationality_id,
        province_id,
        district_id,
        gapa_napa_id,
        wardno,
        bidesh_nagarik_address_details
    } = req.body;

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let sql = '';
        let values = [];

        if ( Number( nationality_id ) === 1 ) {
            await connection.query( `UPDATE bandi_person SET nationality = 'स्वदेशी' WHERE id=?`, [id] );
            sql = `
        UPDATE bandi_address
        SET nationality_id = ?, province_id = ?, district_id = ?, gapa_napa_id = ?, wardno = ?,
            updated_by = ?, current_office_id = ?
        WHERE id = ?`;
            values = [nationality_id, province_id, district_id, gapa_napa_id, wardno, user_id, active_office, id];
        } else {
            await connection.query( `UPDATE bandi_person SET nationality = 'विदेशी' WHERE id=?`, [id] );
            sql = `
        UPDATE bandi_address
        SET nationality_id = ?, bidesh_nagarik_address_details = ?,
            updated_by = ?, current_office_id = ?
        WHERE id = ?`;
            values = [nationality_id, bidesh_nagarik_address_details || null, user_id, active_office, id];
        }

        const [result] = await connection.query( sql, values );

        await connection.commit();
        res.json( {
            Status: true,
            message: "बन्दी ठेगाना सफलतापूर्वक अद्यावधिक गरियो।"
        } );

    } catch ( error ) {
        if ( connection ) await connection.rollback();
        console.error( "❌ Address update failed:", error );
        res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो।"
        } );

    } finally {
        if ( connection ) connection.release();
    }
} );

router.post( '/create_bandi_address/', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    // const id = req.params.id;

    const {
        bandi_id,
        nationality_id,
        province_id,
        district_id,
        gapa_napa_id,
        wardno,
        bidesh_nagarik_address_details
    } = req.body;

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let sql = '';
        let values = [];

        if ( Number( nationality_id ) === 1 ) {
            sql = `
        INSERT INTO bandi_address(bandi_id, nationality_id, province_id, district_id, gapa_napa_id, wardno,created_by, current_office_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            values = [bandi_id, nationality_id, province_id, district_id, gapa_napa_id, wardno, user_id, active_office];
        } else {
            sql = `
        INSERT INTO bandi_address(bandi_id, nationality_id, bidesh_nagarik_address_details, created_by, current_office_id)
        VALUES (?, ?, ?, ?, ?)`;
            values = [bandi_id, nationality_id, bidesh_nagarik_address_details || null, user_id, active_office];
        }

        const [result] = await connection.query( sql, values );

        await connection.commit();
        res.json( {
            Status: true,
            message: "बन्दी ठेगाना सफलतापूर्वक अद्यावधिक गरियो।"
        } );

    } catch ( error ) {
        if ( connection ) await connection.rollback();
        console.error( "❌ Address update failed:", error );
        res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो।"
        } );

    } finally {
        if ( connection ) connection.release();
    }
} );


router.get( '/get_bandi_kaid_details/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT bkd.*, bp.bandi_type FROM bandi_kaid_details bkd 
        LEFT JOIN bandi_person bp ON bkd.bandi_id=bp.id 
        WHERE bandi_id = ?
    `;
    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi Kaid Details not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.put( '/update_bandi_kaid_details/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const id = req.params.id;

    const {
        bandi_id,
        bandi_type,
        hirasat_years,
        hirasat_months,
        hirasat_days,
        thuna_date_bs,
        release_date_bs,
        is_life_time = 0
    } = req.body;

    let connection;

    try {
        // Date conversion
        const thunaDateAd = thuna_date_bs ? await bs2ad( thuna_date_bs ) : '2001-01-01';
        // const releaseDateAd = release_date_bs ? await bs2ad( release_date_bs ) : '2001-01-01';

        connection = await pool.getConnection();
        await connection.beginTransaction();

        let updateKaidSql = '';
        let kaidValues = [];
        //  release_date_ad = ?, releaseDateAd,
        if ( bandi_type === 'कैदी' ) {
            updateKaidSql = `
        UPDATE bandi_kaid_details
        SET hirasat_years = ?, hirasat_months = ?, hirasat_days = ?,
            thuna_date_bs = ?, thuna_date_ad = ?, release_date_bs = ?,
            is_life_time = ?,
            updated_by = ?
        WHERE id = ?`;
            kaidValues = [
                hirasat_years, hirasat_months, hirasat_days,
                thuna_date_bs, thunaDateAd,
                release_date_bs, is_life_time,
                user_id,
                id
            ];
        } else if ( bandi_type === 'थुनुवा' ) {
            updateKaidSql = `
        UPDATE bandi_kaid_details
        SET hirasat_years = ?, hirasat_months = ?, hirasat_days = ?,
            thuna_date_bs = ?, thuna_date_ad = ?,
            updated_by = ?
        WHERE id = ?`;
            kaidValues = [
                hirasat_years, hirasat_months, hirasat_days,
                thuna_date_bs, thunaDateAd,
                user_id,
                id
            ];
        } else {
            throw new Error( 'Invalid bandi_type' );
        }

        // Update kaid details
        await connection.query( updateKaidSql, kaidValues );

        // Update bandi type in bandi_person
        await connection.query(
            `UPDATE bandi_person SET bandi_type = ?, updated_by = ? WHERE id = ?`,
            [bandi_type, user_id, bandi_id]
        );

        await connection.commit();
        return res.json( {
            Status: true,
            message: "बन्दी कैद विवरण सफलतापूर्वक अद्यावधिक गरियो।"
        } );

    } catch ( error ) {
        if ( connection ) await connection.rollback();
        console.error( "❌ Update failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );

    } finally {
        if ( connection ) connection.release();
    }
} );

router.get( '/get_bandi_family/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT bri.* , r.relation_np
        FROM bandi_relative_info bri
        LEFT JOIN relationships r ON bri.relation_id = r.id
        WHERE bandi_id = ?
    `;

    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi Family not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.post( '/create_bandi_family', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const { bandi_id, relation_np, relative_name, relative_address, contact_no } = req.body;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const sql = `
      INSERT INTO bandi_relative_info
        (bandi_id, relative_name, relation_id, relative_address, contact_no, created_by, updated_by, current_office_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [bandi_id, relative_name, relation_np, relative_address, contact_no, user_id, user_id, active_office];

        await connection.query( sql, values );

        await connection.commit();

        res.json( {
            Result: bandi_id,
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );
    } catch ( error ) {
        if ( connection ) await connection.rollback();

        console.error( "Transaction failed:", error );
        res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );


router.put( '/update_bandi_family/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const id = req.params.id;
    const { relation_np, relative_name, relative_address, contact_no, is_dependent, dob } = req.body;

    let connection; // ✅ Declare outside

    try {
        connection = await pool.getConnection(); // ✅ Initialize inside
        await connection.beginTransaction();

        const sql = `
            UPDATE bandi_relative_info 
            SET relative_name = ?, relation_id = ?, relative_address = ?, contact_no = ?,
             is_dependent=?, dob=?, updated_by = ?, current_office_id = ?
            WHERE id = ?
        `;
        const values = [relative_name, relation_np, relative_address, contact_no,
            is_dependent, dob, user_id, active_office, id];

        await connection.query( sql, values ); // ✅ Use await here

        await connection.commit();
        return res.json( {
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        if ( connection ) await connection.rollback(); // ✅ Safely rollback if connection is defined

        console.error( "Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );

    } finally {
        if ( connection ) connection.release(); // ✅ Always release connection if obtained
    }
} );


router.get( '/get_bandi_id_card/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT bid.*, nd.district_name_np AS card_issue_district_name, git.govt_id_name_np 
        FROM bandi_id_card_details bid
        LEFT JOIN govt_id_types git ON bid.card_type_id = git.id
        LEFT JOIN np_district nd ON bid.card_issue_district=nd.did
        WHERE bandi_id = ?
    `;

    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.post( '/create_bandi_IdCard', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;

    const { bandi_id, card_type_id, card_name, card_no, card_issue_district, card_issue_date } = req.body;

    // console.log(req.body)
    let connection;
    try {
        connection = await pool.getConnection();
        // await beginTransactionAsync();
        let sql = '';
        let values = '';

        values = [bandi_id, card_type_id, card_name, card_no, card_issue_district, card_issue_date, user_id, user_id, active_office];
        sql = `INSERT INTO bandi_id_card_details(
            bandi_id, card_type_id, card_name, card_no, card_issue_district, card_issue_date, created_by, updated_by, current_office_id) VALUES(?)`;
        // const [result] = await pool.query( sql, [values] );
        await connection.query( sql, [values] );
        // await commitAsync(); // Commit the transaction
        await connection.commit();
        return res.json( {
            Result: bandi_id,
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync(); // Rollback the transaction if error occurs
        if ( connection ) await connection.rollback();
        console.error( "Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.put( '/update_bandi_IdCard/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const id = req.params.id;
    // console.log(id)
    const { card_type_id, card_no, card_name, card_issue_district, card_issue_date } = req.body;

    // console.log(req.body)
    let connection;
    try {
        connection = await pool.getConnection();
        // await beginTransactionAsync();
        await connection.beginTransaction();
        let sql = '';
        let values = '';

        values = [card_type_id, card_name, card_no, card_issue_district, card_issue_date, id];
        sql = `
            UPDATE bandi_id_card_details 
            SET card_type_id=?, card_name=?, card_no=?,  card_issue_district=?, card_issue_date = ? 
            WHERE id = ?
            `;

        // const [result] = await pool.query( sql, values );
        // await commitAsync(); // Commit the transaction
        await connection.query( sql, values );
        await connection.commit();
        return res.json( {
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync(); // Rollback the transaction if error occurs
        await connection.rollback();

        console.error( "Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.post( '/create_bandi_mudda', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.id;

    const { bandi_id, mudda_id, mudda_no, mudda_condition, mudda_phesala_antim_office_id,
        mudda_phesala_antim_office_district, mudda_phesala_antim_office_date, vadi,
        hirasat_years, hirasat_months, hirasat_days,
        thuna_date_bs, release_date_bs, is_life_time,
        is_main_mudda, is_last_mudda
    } = req.body;

    // console.log(req.body)
    let connection;
    try {
        connection = await pool.getConnection();
        // await beginTransactionAsync();
        await connection.beginTransaction();
        const values = [
            bandi_id, mudda_id, mudda_no, mudda_condition, mudda_phesala_antim_office_id,
            mudda_phesala_antim_office_district, mudda_phesala_antim_office_date, vadi,
            hirasat_years, hirasat_months, hirasat_days,
            thuna_date_bs, release_date_bs, is_life_time,
            is_main_mudda, is_last_mudda,
            user_id, user_id, active_office
        ];

        const sql = `
            INSERT INTO bandi_mudda_details (
                bandi_id, mudda_id, mudda_no, mudda_condition, mudda_phesala_antim_office_id,
                mudda_phesala_antim_office_district, mudda_phesala_antim_office_date, vadi,
                hirasat_years, hirasat_months, hirasat_days,
                thuna_date_bs, release_date_bs, is_life_time,
                is_main_mudda, is_last_mudda, 
                created_by, updated_by, current_office_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
        // const [result] = await pool.query( sql, [values] );
        // await commitAsync(); // Commit the transaction
        const [result] = await connection.query( sql, values );

        await connection.commit();
        return res.json( {
            // Result: bandi_id,
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );
    } catch ( error ) {
        // await rollbackAsync(); // Rollback the transaction if error occurs
        await connection.rollback();

        console.error( "Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.put( '/update_bandi_mudda/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const id = req.params.id;

    const {
        bandi_id,
        mudda_id,
        mudda_no,
        mudda_condition,
        vadi,
        mudda_phesala_antim_office_id,
        mudda_phesala_antim_office_district,
        mudda_phesala_antim_office_date,
        hirasat_years, hirasat_months, hirasat_days,
        thuna_date_bs, release_date_bs, is_life_time,
        is_main_mudda,
        is_last_mudda
    } = req.body;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const sql = `
            UPDATE bandi_mudda_details 
            SET mudda_id=?, mudda_no=?, mudda_condition=?, vadi=?, mudda_phesala_antim_office_id=?,
                mudda_phesala_antim_office_district=?, mudda_phesala_antim_office_date=?,
                hirasat_years=?, hirasat_months=?, hirasat_days=?, 
                thuna_date_bs=?, release_date_bs=?, is_life_time=?,
                is_main_mudda=?, is_last_mudda=? 
            WHERE id = ?
        `;

        const values = [
            mudda_id,
            mudda_no,
            mudda_condition,
            vadi,
            mudda_phesala_antim_office_id,
            mudda_phesala_antim_office_district,
            mudda_phesala_antim_office_date,
            hirasat_years, hirasat_months, hirasat_days,
            thuna_date_bs, release_date_bs, is_life_time,
            is_main_mudda,
            is_last_mudda,
            id
        ];

        await connection.query( sql, values );

        const kaidDetailsSql = `
            UPDATE bandi_kaid_details
            SET hirasat_years = ?, hirasat_months = ?, hirasat_days = ?,
            thuna_date_bs = ?, release_date_bs = ?, is_life_time = ?,
            updated_by = ?, updated_at=?, current_office_id = ? WHERE bandi_id=?`;
        const kaidDetailValue = [hirasat_years, hirasat_months, hirasat_days,
            thuna_date_bs, release_date_bs, is_life_time, 1, new Date(), active_office, bandi_id];
        if ( is_main_mudda ) {
            await connection.query( kaidDetailsSql, kaidDetailValue );
        }
        await connection.commit();

        return res.json( {
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        if ( connection ) await connection.rollback();

        console.error( "Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );

    } finally {
        if ( connection ) connection.release();
    }
} );


router.get( '/get_bandi_fines/', async ( req, res ) => {
    // const active_office = req.user.office_id;
    const { id } = req.params;
    const sql = `
        SELECT bfd.*, 
            f.fine_name_np,
            o.office_name_with_letter_address AS deposit_office                       
        FROM bandi_fine_details bfd
        LEFT JOIN fine_types f ON bfd.fine_type_id = f.id
        LEFT JOIN offices o ON bfd.deposit_office = o.id
    `;
    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.get( '/get_bandi_no_punrabedan/', async ( req, res ) => {
    // const active_office = req.user.office_id;
    const { id } = req.params;
    const sql = `
        SELECT bpd.*,             
            o.office_name_with_letter_address AS punarabedan_office                       
        FROM bandi_punarabedan_details bpd        
        LEFT JOIN offices o ON bpd.punarabedan_office_id = o.id
    `;
    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.get( '/get_bandi_mudda/', async ( req, res ) => {
    // const active_office = req.user.office_id;
    const { id } = req.params;
    const sql = `
        SELECT bmd.*, m.mudda_name,
    o.office_name_with_letter_address,
    o.office_name_with_letter_address AS mudda_office,
    nd.district_name_np
        FROM bandi_mudda_details bmd
        LEFT JOIN muddas m ON bmd.mudda_id = m.id
        LEFT JOIN offices o ON bmd.mudda_phesala_antim_office_id = o.id
        LEFT JOIN np_district nd ON bmd.mudda_phesala_antim_office_district = nd.did
    `;
    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.get( '/get_bandi_mudda/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT bmd.*, m.mudda_name,
    o.office_name_with_letter_address,
    nd.district_name_np
        FROM bandi_mudda_details bmd
        LEFT JOIN muddas m ON bmd.mudda_id = m.id
        LEFT JOIN offices o ON bmd.mudda_phesala_antim_office_id = o.id
        LEFT JOIN np_district nd ON bmd.mudda_phesala_antim_office_district = nd.did
        WHERE bandi_id = ?
    `;

    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.get( '/get_bandi_fine/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT bfd.*,
        ft.fine_name_np,
    o.office_name_with_letter_address AS office_name_nep,
    nd.district_name_np
        FROM bandi_fine_details bfd
        LEFT JOIN fine_types ft ON bfd.fine_type_id=ft.id
        LEFT JOIN offices o ON bfd.deposit_office = o.id
        LEFT JOIN np_district nd ON bfd.deposit_district = nd.did
        WHERE bandi_id = ?
    `;

    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.put( '/update_bandi_fine/:id', verifyToken, async ( req, res ) => {
    const id = req.params.id;
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;
    const {
        fine_type_id,
        amount_fixed, amount_deposited, deposit_office, deposit_district, deposit_ch_no, deposit_date,
        deposit_amount, district_name_np, fine_type
    } = req.body;
    // console.log(req.body)
    let sql;
    let values;
    sql = `UPDATE bandi_fine_details SET 
    fine_type_id=?, amount_fixed =?, amount_deposited =?, deposit_office =?, 
    deposit_district =?, deposit_ch_no =?, deposit_date =?, deposit_amount =?, updated_by=? WHERE id =? `;
    if ( Number( amount_fixed ) === 1 ) {
        if ( Number( amount_deposited ) === 1 ) {
            values = [
                fine_type_id, amount_fixed, amount_deposited, deposit_office, deposit_district, deposit_ch_no, deposit_date,
                deposit_amount, user_id, id
            ];
        } else {
            values = [
                fine_type_id, amount_fixed, amount_deposited, null, null, null, null, deposit_amount, user_id, id
            ];
        }
    } else {
        values = [
            fine_type_id, amount_fixed, null, null, null, null, null, null, user_id, id
        ];
    }
    try {
        const [result] = await pool.query( sql, values );
        // console.log( result );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'Database error', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal Server Error' } );
    }
} );

router.delete( '/delete_bandi_fine/:id', verifyToken, async ( req, res ) => {
    const { id } = req.params;
    console.log( id );
    try {
        const sql = `DELETE FROM bandi_fine_details WHERE id =? `;
        const [result] = await pool.query( sql, id );
        return res.json( { Status: true, Result: 'Record Deleted Successfully!' } );
    } catch ( err ) {
        console.error( 'Error Deleting Record:', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal Server Error' } );
    }
} );

router.get( '/get_bandi_punrabedn/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT bpd.*,
    o.office_name_with_letter_address,
    nd.district_name_np
        FROM bandi_punarabedan_details bpd
        LEFT JOIN offices o ON bpd.punarabedan_office_id = o.id
        LEFT JOIN np_district nd ON o.district_Id = nd.did
        WHERE bandi_id = ?
    `;

    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.put( '/update_bandi_punrabedn/:id', verifyToken, async ( req, res ) => {
    const id = req.params.id;
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;
    const {
        punarabedan_office_id, punarabedan_office_district, punarabedan_office_ch_no, punarabedan_office_date
    } = req.body;
    // console.log(req.body)
    // const updated_by = 1;
    const sql = `UPDATE bandi_punarabedan_details SET punarabedan_office_id =?,
    punarabedan_office_district =?, punarabedan_office_ch_no =?, punarabedan_office_date =?,
    updated_by =?, current_office_id =? WHERE id =? `;
    const values = [
        punarabedan_office_id, punarabedan_office_district, punarabedan_office_ch_no, punarabedan_office_date, user_id, user_office_id, id
    ];
    try {
        const [result] = await pool.query( sql, values );
        console.log( result );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( 'Database error', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal Server Error' } );
    }
} );

router.post( '/create_bandi_diseases', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    let connection;
    try {
        connection = await pool.getConnection();
        console.log( "📥 Full Request Body:", JSON.stringify( req.body, null, 2 ) );

        const insertCount = await insertDiseasesDetails(
            req.body.bandi_id,
            req.body.bandi_diseases,
            user_id,
            active_office,
            connection
        );

        if ( insertCount === 0 ) {
            // await rollbackAsync();
            await connection.rollback();
            console.warn( "⚠️ No rows inserted. Possible bad data structure." );
            return res.status( 400 ).json( {
                Status: false,
                message: "डेटा इन्सर्ट गर्न सकेनौं। सम्भवत: 'relation_id' छुट्यो वा गलत ढाँचा।"
            } );
        }

        // await commitAsync();
        await connection.commit();
        return res.json( {
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync();
        await connection.rollback();
        console.error( "❌ Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.get( '/get_bandi_diseases/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT bdd.id, bdd.bandi_id, bdd.disease_id, bdd.disease_name as disease_name_if_other,
        d.disease_name_np    
        FROM bandi_diseases_details bdd        
        LEFT JOIN diseases d ON bdd.disease_id = d.id
        WHERE bandi_id = ?
    `;
    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi Diseases ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.put( '/update_bandi_diseases/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const disabilityId = req.params.id;
    let connection;
    try {
        connection = await pool.getConnection();
        console.log( "📝 Update disability request:", req.body );
        const updatedCount = await updateDisabilities( disabilityId, req.body, user_id, active_office, connection );

        if ( updatedCount === 0 ) {
            return res.status( 400 ).json( {
                Status: false,
                message: "डेटा अपडेट गर्न सकेनौं। कृपया सबै विवरणहरू जाँच गर्नुहोस्।"
            } );
        }

        // await commitAsync();
        await connection.commit();

        return res.json( {
            Status: true,
            message: "बन्दी अपाङ्गता विवरण सफलतापूर्वक अपडेट गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync();
        await connection.rollback();
        console.error( "❌ Update failed:", error );

        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, अपाङ्गता विवरण अपडेट गर्न असफल।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );


router.post( '/create_bandi_disability', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    let connection;
    try {
        // console.log( "📥 Full Request Body:", JSON.stringify( req.body, null, 2 ) );
        connection = await pool.getConnection();
        const insertCount = await insertDisablilityDetails(
            req.body.bandi_id,
            req.body.bandi_disability,
            user_id,
            active_office,
            connection
        );

        if ( insertCount === 0 ) {
            // await rollbackAsync();
            await connection.rollback();
            console.warn( "⚠️ No rows inserted. Possible bad data structure." );
            return res.status( 400 ).json( {
                Status: false,
                message: "डेटा इन्सर्ट गर्न सकेनौं। सम्भवत: 'relation_id' छुट्यो वा गलत ढाँचा।"
            } );
        }

        // await commitAsync();
        await connection.commit();
        return res.json( {
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync();
        await connection.rollback();
        console.error( "❌ Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.get( '/get_bandi_disability/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT bdd.id, bdd.bandi_id, bdd.disability_id, bdd.disability_name as disabliity_name_if_other,
        d.disablility_name_np    
        FROM bandi_disability_details bdd        
        LEFT JOIN disabilities d ON bdd.disability_id = d.id
        WHERE bandi_id = ?
    `;
    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi Disability ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.put( '/update_bandi_disability/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const disabilityId = req.params.id;

    let connection;
    try {
        connection = await pool.getConnection();
        console.log( "📝 Update disability request:", req.body );
        const updatedCount = await updateDisabilities( disabilityId, req.body, user_id, active_office );

        if ( updatedCount === 0 ) {
            return res.status( 400 ).json( {
                Status: false,
                message: "डेटा अपडेट गर्न सकेनौं। कृपया सबै विवरणहरू जाँच गर्नुहोस्।"
            } );
        }

        // await commitAsync();
        await connection.commit();

        return res.json( {
            Status: true,
            message: "बन्दी रोग विवरण सफलतापूर्वक अपडेट गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync();
        await connection.rollback();
        console.error( "❌ Update failed:", error );

        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, रोग विवरण अपडेट गर्न असफल।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.post( '/create_bandi_contact_person', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;

    let connection;
    try {
        connection = await pool.getConnection();
        console.log( "📥 Full Request Body:", JSON.stringify( req.body, null, 2 ) );

        const insertCount = await insertContacts(
            req.body.bandi_id,
            req.body.contact_person,
            user_id,
            active_office,
            connection
        );

        if ( insertCount === 0 ) {
            // await rollbackAsync();
            await connection.rollback();
            console.warn( "⚠️ No rows inserted. Possible bad data structure." );
            return res.status( 400 ).json( {
                Status: false,
                message: "डेटा इन्सर्ट गर्न सकेनौं। सम्भवत: 'relation_id' छुट्यो वा गलत ढाँचा।"
            } );
        }

        // await commitAsync();
        await connection.commit();
        return res.json( {
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync();
        await connection.rollback();
        console.error( "❌ Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.get( '/get_bandi_contact_person/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
        SELECT bcp.id, bcp.bandi_id, bcp.relation_id, relation_np as relation_np, bcp.contact_name, bcp.contact_address,
        bcp.contact_contact_details        
        FROM bandi_contact_person bcp        
        LEFT JOIN relationships r ON bcp.relation_id = r.id
        WHERE bandi_id = ?
    `;
    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );

router.put( '/update_bandi_contact_person/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const contactId = req.params.id;

    let connection;
    try {
        connection = await pool.getConnection();
        console.log( "📝 Update contact request:", req.body );

        const updatedCount = await updateContactPerson( contactId, req.body, user_id, active_office, connection );

        if ( updatedCount === 0 ) {
            return res.status( 400 ).json( {
                Status: false,
                message: "डेटा अपडेट गर्न सकेनौं। कृपया सबै विवरणहरू जाँच गर्नुहोस्।"
            } );
        }

        // await commitAsync();
        await connection.commit();

        return res.json( {
            Status: true,
            message: "बन्दी सम्पर्क व्यक्ति विवरण सफलतापूर्वक अपडेट गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync();
        await connection.rollback();
        console.error( "❌ Update failed:", error );

        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सम्पर्क विवरण अपडेट गर्न असफल।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

//
router.post( '/create_bandi_transfer_history', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const status_id = 12;
    let connection;
    try {
        connection = await pool.getConnection();
        // console.log( "📥 Full Request Body:", JSON.stringify( req.body, null, 2 ) );        
        const insertCount = await insertTransferDetails(
            req.body.bandi_id,
            req.body.bandi_transfer_details,
            status_id,
            user_id,
            active_office,
            connection
        );

        if ( insertCount === 0 || !insertCount ) {
            // await rollbackAsync();
            await connection.rollback();
            console.warn( "⚠️ No rows inserted. Possible bad data structure." );
            return res.status( 400 ).json( {
                Status: false,
                message: "डेटा इन्सर्ट गर्न सकेनौं। सम्भवत: 'data' छुट्यो वा गलत ढाँचा।"
            } );
        }

        // await commitAsync();
        await connection.commit();
        return res.json( {
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync();
        await connection.rollback();
        console.error( "❌ Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.post( '/create_bandi_transfer_request', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const data = req.body.bandi_transfer_details?.[0];
    let connection;
    try {
        connection = await pool.getConnection();
        // console.log( "📥 Full Request Body:", JSON.stringify( req.body, null, 2 ) );   
        console.log( data );
        const bandi_transfer_details = [{
            transfer_from_office_id: active_office,
            transfer_to_office_id: data.transfer_to_office_id,
            transfer_reason_id: data.transfer_reason_id,
            transfer_reason: data.transfer_reason,
            is_thunuwa_permission: data.is_thunuwa_permission,
            transfer_status: 1,
        }];
        console.log( 'details:', bandi_transfer_details );
        const insertCount = await insertTransferRequest(
            req.body.bandi_id,
            bandi_transfer_details,
            user_id,
            active_office,
            connection
        );

        if ( insertCount === 0 || !insertCount ) {
            // await rollbackAsync();
            await connection.rollback();
            console.warn( "⚠️ No rows inserted. Possible bad data structure." );
            return res.status( 400 ).json( {
                Status: false,
                message: "डेटा इन्सर्ट गर्न सकेनौं। सम्भवत: 'data' छुट्यो वा गलत ढाँचा।"
            } );
        }

        // await commitAsync();
        await connection.commit();
        return res.json( {
            Status: true,
            message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
        } );

    } catch ( error ) {
        // await rollbackAsync();
        await connection.rollback();
        console.error( "❌ Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );
//
router.get( '/get_bandi_transfer_history/:id', async ( req, res ) => {
    const { id } = req.params;
    const sql = `
    SELECT bth.*, 
    o.office_name_with_letter_address AS transfer_from_office_fn,
    oo.office_name_with_letter_address AS transfer_to_office_fn,
    btr.transfer_reason_np
    FROM bandi_transfer_history bth
    LEFT JOIN offices o ON bth.transfer_from_office_id = o.id
    LEFT JOIN bandi_transfer_reasons btr ON bth.transfer_reason_id=btr.id
    LEFT JOIN offices oo ON bth.final_to_office_id = oo.id
    WHERE bandi_id=?
    `;
    try {
        const [result] = await pool.query( sql, [id] ); // Use promise-wrapped query
        // console.log(result)
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi ID not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
    }
} );
//
router.put( '/update_bandi_transfer_history/:id', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const transfer_id = req.params.id;

    let connection;
    try {
        connection = await pool.getConnection();

        console.log( "📝 Update request body:", req.body );

        const updatedCount = await updateTransferDetails(
            transfer_id,
            req.body,
            user_id,
            active_office,
            connection
        );

        if ( updatedCount === 0 ) {
            await connection.rollback();
            return res.status( 400 ).json( {
                Status: false,
                message: "डेटा अपडेट गर्न सकेनौं। कृपया सबै विवरणहरू जाँच गर्नुहोस्।",
            } );
        }

        await connection.commit();

        return res.json( {
            Status: true,
            message: "बन्दी ट्रान्सफर विवरण सफलतापूर्वक अपडेट गरियो।",
        } );

    } catch ( error ) {
        await connection.rollback();
        console.error( "❌ Update failed:", error );

        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, विवरण अपडेट गर्न असफल।",
        } );
    } finally {
        if ( connection ) connection.release();
    }
} );


router.post( '/create_payrole', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const {
        bandi_id, payrole_no, mudda_id, payrole_count_date, payrole_entry_date, other_details,
        payrole_reason, payrole_remarks, payrole_niranay_no, payrole_decision_date,
        payrole_granted_letter_no, payrole_granted_letter_date, pyarole_rakhan_upayukat,
        dopmremark
    } = req.body;

    console.log( 'bandi_id', bandi_id );
    let payrole_no_bandi_id = '';
    if ( bandi_id && payrole_no ) {
        let payrole_no_bandi = String( payrole_no ) + String( bandi_id );
        payrole_no_bandi_id = payrole_no_bandi;
    }

    try {
        await beginTransactionAsync();

        let sql = '';
        let values = [];

        if ( payrole_niranay_no ) {
            // FIX or remove this block if irrelevant
            // Assuming you want to insert into another table
            // values = [bandi_id, relation_id, no_of_children]; // define those variables properly
            // sql = `INSERT INTO bandi_relative_info(bandi_id, relation_id, no_of_children) VALUES(?, ?, ?)`;
            // await queryAsync(sql, values);
        } else {
            values = [
                payrole_no_bandi_id,
                mudda_id,
                payrole_count_date,
                payrole_entry_date,
                payrole_reason,
                other_details,
                payrole_remarks,
                0, // status
                payrole_no,
                bandi_id,
                user_id,
                user_id,
                active_office,
                active_office
            ];
            sql = `
                INSERT INTO payroles(
        payrole_no_bandi_id,payrole_mudda_id, ganana_date, payrole_entery_date, payrole_reason,
        other_details, remark, status, payrole_no_id, bandi_id, user_id, created_by, created_office
    ) VALUES(?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
        `;

            const [result] = await pool.query( sql, values );
            const inserted_id = result.insertId;
            console.log( inserted_id );
            await commitAsync();

            return res.json( {
                // Result: inserted_id,
                Status: true,
                message: "बन्दी विवरण सफलतापूर्वक सुरक्षित गरियो।"
            } );
        }

    } catch ( error ) {
        await rollbackAsync();
        console.error( "Transaction failed:", error );
        return res.status( 500 ).json( {
            Status: false,
            Error: error.message,
            message: "सर्भर त्रुटि भयो, सबै डाटा पूर्वस्थितिमा फर्काइयो।"
        } );
    }
} );

router.get( '/get_payroles/', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;

    let sql;

    if ( active_office == 1 || active_office == 2 ) {
        // Admin – see all payrole records (only those with payrole_no_id)
        sql = `
SELECT * FROM(
    ${ getBandiQuery }
) AS sub
            WHERE sub.payrole_no_id IS NOT NULL

    `;
    } else {
        // Non-admin – only those in their office
        sql = `
SELECT * FROM(
    ${ getBandiQuery }
) AS sub
            WHERE sub.payrole_no_id IS NOT NULL AND sub.created_office = ?

    `;
    }

    try {
        const [result] = await pool.query( sql, active_office == 1 || active_office == 2 ? [] : [active_office] );
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "No payrole records found" } );
        }
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( err );
        return res.json( { Status: false, Error: "Query Error" } );
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
        m.mudda_name
      FROM payroles p
      LEFT JOIN bandi_person bp ON p.bandi_id = bp.id
      LEFT JOIN muddas m ON p.payrole_mudda_id = m.id
      WHERE p.status = 4
    `;

        let finalQuery = baseQuery;
        let queryParams = [];

        // Restrict results for lower-level offices (office_id >= 2)
        if ( user_office_id > 2 ) {
            finalQuery += ` AND (p.created_office = ? OR p.updated_office = ?)`;
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

router.put( '/update_payrole/:id', verifyToken, async ( req, res ) => {
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;
    const {
        dopmremark,
        pyarole_rakhan_upayukat,
        payrole_id,
        is_checked,
        payrole_niranay_no,
        payrole_decision_date,
        payrole_granted_letter_no,
        payrole_granted_letter_date,
        result,
        arre,
        thuna_date_bs,

        // Missing ones:
        mudda_id,
        arrest_date,
        release_date,
        payrole_nos,
        payrole_granted_court,
        payrole_granted_aadesh_date,
        payrole_result,
        payrole_decision_remark,
        kaid_bhuktan_duration,
        kaid_bhuktan_percentage,
        baki_kaid_duration,
        baki_kaid_percent,
    } = req.body;




    try {
        let sql = '';
        let values = [];

        const existingReviews = await query( `SELECT * FROM payrole_reviews WHERE payrole_id = ?`, [payrole_id] );

        if ( ( user_office_id === 1 || user_office_id === 2 ) ) {
            if ( pyarole_rakhan_upayukat ) {
                if ( existingReviews.length > 0 ) {
                    sql = `
                UPDATE payrole_reviews 
                SET pyarole_rakhan_upayukat = ?, dopmremark = ?, reviewed_by = ?, reviewed_office_id = ?
                WHERE payrole_id = ?`;
                    values = [pyarole_rakhan_upayukat, dopmremark, user_id, user_office_id, payrole_id];
                } else {
                    sql = `
                INSERT INTO payrole_reviews (payrole_id, pyarole_rakhan_upayukat, dopmremark, reviewed_by, reviewed_office_id)
                VALUES (?, ?, ?, ?, ?)`;
                    values = [payrole_id, pyarole_rakhan_upayukat, dopmremark, user_id, user_office_id];
                }
            } else if ( is_checked ) {
                if ( existingReviews.length > 0 ) {
                    sql = `
                UPDATE payrole_reviews SET is_checked = ? WHERE payrole_id = ?`;
                    values = [is_checked, payrole_id];
                } else {
                    sql = `
                INSERT INTO payrole_reviews (payrole_id, is_checked, reviewed_by, reviewed_office_id)
                VALUES (?, ?, ?, ?)`;
                    values = [payrole_id, is_checked, user_id, user_office_id];
                }
            }
        } else {
            if ( payrole_decision_date || payrole_granted_letter_no ) {
                if ( existingReviews.length > 0 ) {
                    console.log( 'updated' );
                    sql = `
                UPDATE payrole_decisions 
                SET payrole_niranay_no = ?, payrole_decision_date = ?, payrole_granted_letter_no = ?, payrole_granted_letter_date = ?, result=?
                WHERE payrole_id = ?`;
                    values = [payrole_niranay_no, payrole_decision_date, payrole_granted_letter_no, payrole_granted_letter_date, result, payrole_id];
                } else {
                    console.log( 'inserted' );
                    sql = `
                INSERT INTO payrole_decisions (payrole_id, mudda_id, arrest_date, release_date, payrole_nos, 
                payrole_decision_date, payrole_granted_court, payrole_granted_aadesh_date, 
                payrole_granted_letter_no, payrole_granted_letter_date, payrole_result, payrole_decision_remark,
                kaid_bhuktan_duration, kaid_bhuktan_percentage, baki_kaid_duration, baki_kaid_percent, 
                decision_updated_by, decision_updated_office)
                VALUES (?, ?, ?, ?, ?, ?)`;
                    values = [payrole_id, mudda_id, arrest_date, release_date, payrole_nos,
                        payrole_decision_date, payrole_granted_court, payrole_granted_aadesh_date,
                        payrole_granted_letter_no, payrole_granted_letter_date, payrole_result, payrole_decision_remark,
                        kaid_bhuktan_duration, kaid_bhuktan_percentage, baki_kaid_duration, baki_kaid_percent,
                        user_id, user_office_id];
                }
            }
        }


        const queryResult = await query( sql, values );
        return res.json( { Status: true, Result: queryResult } );

    } catch ( err ) {
        console.error( 'Database error', err );
        return res.status( 500 ).json( { Status: false, Error: 'Internal Server Error' } );
    }
} );

router.put( "/update_payrole_decision/:id", verifyToken, async ( req, res ) => {
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;

    const {
        bandi_id,
        mudda_id,
        // arrest_date,
        thuna_date_bs,
        release_date_bs,
        payrole_id,
        dopmremark,
        hajir_current_date_bs,
        hajir_next_date_bs,
        hajir_office,
        payrole_decision_date,
        payrole_decision_remark,
        payrole_granted_aadesh_date,
        payrole_granted_court,
        payrole_granted_letter_date,
        payrole_granted_letter_no,
        payrole_nos,
        payrole_result,
        pyarole_rakhan_upayukat,
    } = req.body;

    let arrest_date = '1950-01-01';
    if ( thuna_date_bs ) {
        arrest_date = thuna_date_bs;
    } else {
        arrest_date = '1950-01-01';
    }
    const total_kaid = calculateBSDate( arrest_date, release_date_bs );

    const bhuktan_duration = calculateBSDate( arrest_date, current_date, total_kaid );
    const kaid_bhuktan_duration = bhuktan_duration.formattedDuration || 0;
    const kaid_bhuktan_percentage = bhuktan_duration.percentage || 0;
    const baki_duration = calculateBSDate( current_date, release_date_bs, total_kaid );
    const baki_kaid_duration = baki_duration.formattedDuration || 0;
    const baki_kaid_percent = baki_duration.percentage || 0;

    let connection;
    try {
        // await beginTransactionAsync();
        connection = await pool.getConnection();

        const [existing] = await pool.query(
            `SELECT * FROM payrole_decisions WHERE payrole_id = ?`,
            [payrole_id]
        );

        if ( existing.length > 0 ) {
            const sql = `
        UPDATE payrole_decisions
        SET
          bandi_id=?,
          mudda_id = ?,
          arrest_date = ?,
          release_date = ?,
          payrole_nos = ?,
          payrole_decision_date = ?,
          payrole_granted_court = ?,
          payrole_granted_aadesh_date = ?,
          payrole_granted_letter_no = ?,
          payrole_granted_letter_date = ?,
          payrole_result = ?,
          payrole_decision_remark = ?,
          kaid_bhuktan_duration = ?,
          kaid_bhuktan_percentage = ?,
          baki_kaid_duration = ?,
          baki_kaid_percent = ?,
          decision_updated_by = ?,
          decision_updated_office = ?
        WHERE payrole_id = ?
      `;

            const values = [
                bandi_id,
                mudda_id,
                arrest_date,
                release_date_bs,
                payrole_nos,
                payrole_decision_date,
                payrole_granted_court,
                payrole_granted_aadesh_date,
                payrole_granted_letter_no,
                payrole_granted_letter_date,
                payrole_result,
                payrole_decision_remark,
                kaid_bhuktan_duration,
                kaid_bhuktan_percentage,
                baki_kaid_duration,
                baki_kaid_percent,
                user_id,
                user_office_id,
                payrole_id,
            ];

            // await pool.query( sql, values );
            await connection.query( sql, values );
        } else {
            const insertSql = `
        INSERT INTO payrole_decisions (
          payrole_id,bandi_id, mudda_id, arrest_date, release_date, payrole_nos,
          payrole_decision_date, payrole_granted_court, payrole_granted_aadesh_date,
          payrole_granted_letter_no, payrole_granted_letter_date, payrole_result,
          payrole_decision_remark, kaid_bhuktan_duration, kaid_bhuktan_percentage,
          baki_kaid_duration, baki_kaid_percent, decision_updated_by, decision_updated_office
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
            const insertValues = [
                payrole_id,
                bandi_id,
                mudda_id,
                arrest_date,
                release_date_bs,
                payrole_nos,
                payrole_decision_date,
                payrole_granted_court,
                payrole_granted_aadesh_date,
                payrole_granted_letter_no,
                payrole_granted_letter_date,
                payrole_result,
                payrole_decision_remark,
                kaid_bhuktan_duration,
                kaid_bhuktan_percentage,
                baki_kaid_duration,
                baki_kaid_percent,
                user_id,
                user_office_id,
            ];

            // await pool.query( insertSql, insertValues );
            await connection.query( insertSql, insertValues );
        }

        if ( hajir_current_date_bs ) {
            const logSql = `
        INSERT INTO payrole_logs (
          payrole_id, bandi_id, hajir_current_date, hajir_status, hajir_next_date, hajir_office
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

            const logValues = [
                payrole_id,
                bandi_id,
                hajir_current_date_bs,
                1,
                hajir_next_date_bs,
                hajir_office,
            ];

            // await pool.query( logSql, logValues );
            await connection.query( logSql, logValues );
        }

        await connection.query( `UPDATE payroles SET status=? WHERE id=?`, [payrole_result, payrole_id] );

        // await commitAsync();
        await connection.commit();
        return res.json( { Status: true, Message: "Updated successfully" } );
    } catch ( error ) {
        // await rollbackAsync();
        await connection.rollback();
        console.error( "Payrole update error:", error );
        return res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    } finally {
        if ( connection ) connection.release();
    }
} );


router.put( '/update_is_payrole_checked/:id', verifyToken, async ( req, res ) => {
    const id = req.params.id;
    console.log( 'payrole_id', id );
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;
    const {
        is_checked
    } = req.body;
    // console.log('dopmremark',status)
    console.log( req.body );
    const updated_by = 1;
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
router.put( '/update_payrole_status/:id', verifyToken, async ( req, res ) => {
    const id = req.params.id;
    console.log( 'payrole_id', id );
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;
    const { value } = req.body;
    console.log( 'dopmremark', value );
    console.log( req.body );
    const updated_by = 1;
    const sql = `UPDATE payroles SET status = ? WHERE id =?; `;
    const values = [value, id];
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

router.get( '/get_office_wise_count1', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const defaultAge = 65;
    const defaultOfficeCategory = 2;

    const {
        startDate,
        endDate,
        nationality,
        ageFrom,
        ageTo,
        office_id // optional for super admin
    } = req.query;

    const filters = [];
    const params = [];

    // Age filter
    if ( ageFrom && ageTo ) {
        filters.push( 'AND TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) BETWEEN ? AND ?' );
        params.push( Number( ageFrom ), Number( ageTo ) );
    }

    // Nationality filter
    if ( nationality ) {
        filters.push( 'AND bp.nationality = ?' );
        params.push( nationality.trim() );
    }

    // Build office-level and office category filters together
    const officeFilters = ['o.office_categories_id = ?'];
    params.push( defaultOfficeCategory );

    if ( active_office !== 1 && active_office !== 2 ) {
        officeFilters.push( 'o.id = ?' );
        params.push( active_office );
    } else if ( office_id ) {
        officeFilters.push( 'o.id = ?' );
        params.push( office_id );
    }

    const officeWhereClause = `WHERE ${ officeFilters.join( ' AND ' ) }`;

    const baseSql = `
        SELECT
            voad.state_name_np,
            voad.district_order_id,
            o.letter_address AS office_short_name,
            o.id AS office_id,

            COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'male', 1, NULL)) AS kaidi_male,
            COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'female', 1, NULL)) AS kaidi_female,
            COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender NOT IN ('male', 'female'), 1, NULL)) AS kaidi_other,
            COUNT(IF(bp.bandi_type = 'कैदी', 1, NULL)) AS total_kaidi,

            COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'male', 1, NULL)) AS thunuwa_male,
            COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'female', 1, NULL)) AS thunuwa_female,
            COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender NOT IN ('male', 'female'), 1, NULL)) AS thunuwa_other,
            COUNT(IF(bp.bandi_type = 'थुनुवा', 1, NULL)) AS total_thunuwa,

            COUNT(IF(bp.gender = 'male', 1, NULL)) AS total_male,
            COUNT(IF(bp.gender = 'female', 1, NULL)) AS total_female,
            COUNT(IF(bp.gender NOT IN ('male', 'female'), 1, NULL)) AS total_other,
            COUNT(bp.id) AS total_kaidibandi,

            COUNT(IF(bp.is_dependent='1' , 1, NULL)) AS total_aashrit,


            COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'male' AND bp.age >= ${ defaultAge }, 1, NULL)) AS kaidi_male_65plus,
            COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'female' AND bp.age >= ${ defaultAge }, 1, NULL)) AS kaidi_female_65plus,
            COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'male' AND bp.age >= ${ defaultAge }, 1, NULL)) AS thunuwa_male_65plus,
            COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'female' AND bp.age >= ${ defaultAge }, 1, NULL)) AS thunuwa_female_65plus,

            COUNT(IF(bp.country_name_np != 'नेपाल', 1, NULL)) AS foreign_count,
            GROUP_CONCAT(DISTINCT IF(bp.country_name_np != 'नेपाल', bp.country_name_np, NULL)) AS foreign_countries

        FROM offices o
        LEFT JOIN view_office_address_details voad ON o.id = voad.office_id
        LEFT JOIN (
            SELECT 
            bp.id,
            bp.gender,
            bp.bandi_type,
            bp.current_office_id,
            TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) AS age,
            bp.nationality,
            MAX(bri.is_dependent) AS is_dependent,
            vbad.country_name_np        
            FROM bandi_person bp
            LEFT JOIN view_bandi_address_details vbad ON bp.id = vbad.bandi_id
            LEFT JOIN bandi_relative_info bri ON bp.id=bri.bandi_id
            WHERE bp.is_active = 1
            ${ filters.join( ' ' ) }
            GROUP BY 
            bp.id,
            bp.gender,
            bp.bandi_type,
            bp.current_office_id,
            bp.dob_ad,
            bp.nationality,
            vbad.country_name_np
        ) AS bp ON bp.current_office_id = o.id
         
        ${ officeWhereClause }
        GROUP BY voad.state_id, voad.district_order_id, o.letter_address, o.id
        ORDER BY voad.state_id, voad.district_order_id, o.letter_address, o.id;
    `;

    try {
        const [result] = await pool.query( baseSql, params );
        res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_office_wise_count२', verifyToken, async ( req, res ) => {
    try {
        const active_office = req.user.office_id;
        const today_date_bs = new NepaliDate().format( 'YYYY-MM-DD' );
        const defaultAge = 65;
        const defaultOfficeCategory = 2;

        // Extract query params
        let {
            nationality,
            ageFrom,
            ageTo,
            office_id, // optional for super admin
            startDate,
            endDate
        } = req.query;
        // console.log(req.query)
        // Default dates if missing
        if ( !startDate && !endDate ) {
            startDate = '0000-00-00';
            endDate = today_date_bs;
        } else if ( !startDate ) {
            startDate = '0000-00-00';
        } else if ( !endDate ) {
            endDate = today_date_bs;
        }

        // Prepare params array
        const params = [];

        // The order of params must match the ? placeholders in SQL
        // 1-4: defaultAge repeated 4 times (for 65+ counts)
        params.push( defaultAge, defaultAge, defaultAge, defaultAge );

        // 5: thuna_date_bs <= endDate (for subquery filter)
        params.push( endDate );
        // params.push(startDate);

        // 6: karnayan_miti >= startDate (for main WHERE)
        params.push( startDate );
        // params.push(endDate);

        // 7: office_categories_id
        params.push( defaultOfficeCategory );

        // Office filter - either active office or office_id (for superadmin)
        let officeFilterSql = '';
        if ( active_office !== 1 && active_office !== 2 ) {
            params.push( active_office );
            officeFilterSql = 'AND o.id = ?';
        } else if ( office_id ) {
            params.push( office_id );
            officeFilterSql = 'AND o.id = ?';
        }

        // Extra filters for nationality and age range in subquery WHERE
        let extraSubqueryFilters = '';
        if ( nationality ) {
            extraSubqueryFilters += ' AND bp.nationality = ' + pool.escape( nationality.trim() );
        }
        if ( ageFrom && ageTo ) {
            extraSubqueryFilters += ` AND TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) BETWEEN ${ Number( ageFrom ) } AND ${ Number( ageTo ) }`;
        }

        const sql = `
      SELECT
          voad.state_name_np,
          voad.district_order_id,
          o.letter_address AS office_short_name,
          o.id AS office_id,

          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'male', 1, NULL)) AS kaidi_male,
          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'female', 1, NULL)) AS kaidi_female,
          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender NOT IN ('male', 'female'), 1, NULL)) AS kaidi_other,
          COUNT(IF(bp.bandi_type = 'कैदी', 1, NULL)) AS total_kaidi,

          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'male', 1, NULL)) AS thunuwa_male,
          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'female', 1, NULL)) AS thunuwa_female,
          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender NOT IN ('male', 'female'), 1, NULL)) AS thunuwa_other,
          COUNT(IF(bp.bandi_type = 'थुनुवा', 1, NULL)) AS total_thunuwa,

          COUNT(IF(bp.gender = 'male', 1, NULL)) AS total_male,
          COUNT(IF(bp.gender = 'female', 1, NULL)) AS total_female,
          COUNT(IF(bp.gender NOT IN ('male', 'female'), 1, NULL)) AS total_other,
          COUNT(bp.id) AS total_kaidibandi,

          COUNT(IF(bp.is_dependent='1' , 1, NULL)) AS total_aashrit,

          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'male' AND bp.age >= ? , 1, NULL)) AS kaidi_male_65plus,
          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'female' AND bp.age >= ? , 1, NULL)) AS kaidi_female_65plus,
          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'male' AND bp.age >= ? , 1, NULL)) AS thunuwa_male_65plus,
          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'female' AND bp.age >= ? , 1, NULL)) AS thunuwa_female_65plus,

          COUNT(IF(bp.country_name_np != 'नेपाल', 1, NULL)) AS foreign_count,
          GROUP_CONCAT(DISTINCT IF(bp.country_name_np != 'नेपाल', bp.country_name_np, NULL)) AS foreign_countries

      FROM offices o
      LEFT JOIN view_office_address_details voad ON o.id = voad.office_id

      LEFT JOIN (
          SELECT 
              bp.id,
              bp.gender,
              bp.bandi_type,
              bp.current_office_id,
              TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) AS age,
              bp.nationality,
              MAX(bri.is_dependent) AS is_dependent,
              vbad.country_name_np        
          FROM bandi_person bp
          LEFT JOIN view_bandi_address_details vbad ON bp.id = vbad.bandi_id
          LEFT JOIN bandi_relative_info bri ON bp.id = bri.bandi_id
          LEFT JOIN bandi_kaid_details bkd ON bp.id = bkd.bandi_id
          WHERE bkd.thuna_date_bs <= ?
            -- AND bp.is_active = 1
            ${ extraSubqueryFilters }
          GROUP BY 
              bp.id,
              bp.gender,
              bp.bandi_type,
              bp.current_office_id,
              bp.dob_ad,
              bp.nationality,
              vbad.country_name_np
      ) AS bp ON bp.current_office_id = o.id

      LEFT JOIN (
          SELECT bandi_id, MAX(karnayan_miti) AS karnayan_miti
          FROM bandi_release_details
          GROUP BY bandi_id
      ) brd ON brd.bandi_id = bp.id

      WHERE (brd.karnayan_miti IS NULL OR brd.karnayan_miti >= ?)
        AND o.office_categories_id = ?
        ${ officeFilterSql }

      GROUP BY voad.state_id, voad.district_order_id, o.letter_address, o.id
      ORDER BY voad.state_id, voad.district_order_id, o.letter_address, o.id;
    `;

        // Add the extra params for placeholders in SQL query in order
        // Note: defaultAge params are pushed at the start, so we don't push them again here
        // The rest are pushed in correct order above.

        const [rows] = await pool.query( sql, params );
        return res.json( { Status: true, Result: rows } );

    } catch ( error ) {
        console.error( "Error in /get_office_wise_count:", error );
        return res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_office_wise_count3', verifyToken, async ( req, res ) => {
    try {
        const active_office = req.user.office_id;
        const today_date_bs = new NepaliDate().format( 'YYYY-MM-DD' );
        const defaultAge = 65;
        const defaultOfficeCategory = 2;

        let {
            nationality,
            ageFrom,
            ageTo,
            office_id,
            startDate,
            endDate
        } = req.query;

        // Handle default date range if not provided
        if ( !startDate && !endDate ) {
            startDate = '1000-01-01';
            endDate = today_date_bs;
        } else {
            if ( !startDate ) startDate = '1000-01-01';
            if ( !endDate ) endDate = today_date_bs;
        }

        const params = [];

        // 1-4: for 65+ age counts
        params.push( defaultAge, defaultAge, defaultAge, defaultAge );

        // 5: endDate (for thuna_date_bs <= endDate)
        params.push( endDate );

        // 6: startDate (for karnayan_miti >= startDate)
        params.push( startDate );

        // 7: office_categories_id
        params.push( defaultOfficeCategory );

        // Office filter
        let officeFilterSql = '';
        if ( active_office !== 1 && active_office !== 2 ) {
            params.push( active_office );
            officeFilterSql = 'AND o.id = ?';
        } else if ( office_id ) {
            params.push( office_id );
            officeFilterSql = 'AND o.id = ?';
        }

        // Subquery filters
        let extraSubqueryFilters = '';
        if ( nationality ) {
            extraSubqueryFilters += ' AND bp.nationality = ' + pool.escape( nationality.trim() );
        }
        if ( ageFrom && ageTo ) {
            extraSubqueryFilters += ` AND TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) BETWEEN ${ Number( ageFrom ) } AND ${ Number( ageTo ) }`;
        }

        const sql = `
      SELECT
          voad.state_name_np,
          voad.district_order_id,
          o.letter_address AS office_short_name,
          o.id AS office_id,

          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'male', 1, NULL)) AS kaidi_male,
          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'female', 1, NULL)) AS kaidi_female,
          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender NOT IN ('male', 'female'), 1, NULL)) AS kaidi_other,
          COUNT(IF(bp.bandi_type = 'कैदी', 1, NULL)) AS total_kaidi,

          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'male', 1, NULL)) AS thunuwa_male,
          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'female', 1, NULL)) AS thunuwa_female,
          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender NOT IN ('male', 'female'), 1, NULL)) AS thunuwa_other,
          COUNT(IF(bp.bandi_type = 'थुनुवा', 1, NULL)) AS total_thunuwa,

          COUNT(IF(bp.gender = 'male', 1, NULL)) AS total_male,
          COUNT(IF(bp.gender = 'female', 1, NULL)) AS total_female,
          COUNT(IF(bp.gender NOT IN ('male', 'female'), 1, NULL)) AS total_other,
          COUNT(bp.id) AS total_kaidibandi,

          COUNT(IF(bp.is_dependent = '1', 1, NULL)) AS total_aashrit,

          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'male' AND bp.age >= ?, 1, NULL)) AS kaidi_male_65plus,
          COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'female' AND bp.age >= ?, 1, NULL)) AS kaidi_female_65plus,
          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'male' AND bp.age >= ?, 1, NULL)) AS thunuwa_male_65plus,
          COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'female' AND bp.age >= ?, 1, NULL)) AS thunuwa_female_65plus,

          COUNT(IF(bp.country_name_np != 'नेपाल', 1, NULL)) AS foreign_count,
          GROUP_CONCAT(DISTINCT IF(bp.country_name_np != 'नेपाल', bp.country_name_np, NULL)) AS foreign_countries

      FROM offices o
      LEFT JOIN view_office_address_details voad ON o.id = voad.office_id

      LEFT JOIN (
        SELECT 
            bp.id,
            bp.gender,
            bp.bandi_type,
            bp.current_office_id,
            TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) AS age,
            bp.nationality,
            MAX(bri.is_dependent) AS is_dependent,
            vbad.country_name_np        
        FROM bandi_person bp
        LEFT JOIN view_bandi_address_details vbad ON bp.id = vbad.bandi_id
        LEFT JOIN bandi_relative_info bri ON bp.id = bri.bandi_id
        LEFT JOIN bandi_kaid_details bkd ON bp.id = bkd.bandi_id
        WHERE (bkd.thuna_date_bs IS NULL OR bkd.thuna_date_bs <= ?)
          ${ extraSubqueryFilters }
        GROUP BY 
            bp.id,
            bp.gender,
            bp.bandi_type,
            bp.current_office_id,
            bp.dob_ad,
            bp.nationality,
            vbad.country_name_np
      ) AS bp ON bp.current_office_id = o.id

      LEFT JOIN (
        SELECT bandi_id, MAX(karnayan_miti) AS karnayan_miti
        FROM bandi_release_details
        GROUP BY bandi_id
      ) brd ON brd.bandi_id = bp.id

      WHERE (brd.karnayan_miti IS NULL OR brd.karnayan_miti >= ?)
        AND o.office_categories_id = ?
        ${ officeFilterSql }

      GROUP BY voad.state_id, voad.district_order_id, o.letter_address, o.id
      ORDER BY voad.state_id, voad.district_order_id, o.letter_address, o.id;
    `;

        const [rows] = await pool.query( sql, params );
        return res.json( { Status: true, Result: rows } );

    } catch ( error ) {
        console.error( "Error in /get_office_wise_count:", error );
        return res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_office_wise_count', verifyToken, async ( req, res ) => {
    try {
        const active_office = req.user.office_id;
        const today_date_bs = new NepaliDate().format( 'YYYY-MM-DD' );
        const defaultAge = 65;
        const defaultOfficeCategory = 2;

        let {
            nationality,
            ageFrom,
            ageTo,
            office_id,
            startDate,
            endDate
        } = req.query;

        if ( !startDate && !endDate ) {
            startDate = '1000-01-01';
            endDate = today_date_bs;
        } else {
            if ( !startDate ) startDate = '1000-01-01';
            if ( !endDate ) endDate = today_date_bs;
        }

        const params = [defaultAge, defaultAge, defaultAge, defaultAge];
        params.push( startDate, endDate ); // thuna_date_bs BETWEEN
        params.push( endDate ); // release_date_bs cutoff
        params.push( defaultOfficeCategory );

        let officeFilterSql = '';
        if ( active_office !== 1 && active_office !== 2 ) {
            params.push( active_office );
            officeFilterSql = 'AND o.id = ?';
        } else if ( office_id ) {
            params.push( office_id );
            officeFilterSql = 'AND o.id = ?';
        }

        let extraSubqueryFilters = '';
        if ( nationality ) {
            extraSubqueryFilters += ' AND bp.nationality = ' + pool.escape( nationality.trim() );
        }
        if ( ageFrom && ageTo ) {
            extraSubqueryFilters += ` AND TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) BETWEEN ${ Number( ageFrom ) } AND ${ Number( ageTo ) }`;
        }

        const sql = `
      SELECT
        voad.state_name_np,
        voad.district_order_id,
        o.letter_address AS office_short_name,
        o.id AS office_id,

        COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'male', 1, NULL)) AS kaidi_male,
        COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'female', 1, NULL)) AS kaidi_female,
        COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender NOT IN ('male', 'female'), 1, NULL)) AS kaidi_other,
        COUNT(IF(bp.bandi_type = 'कैदी', 1, NULL)) AS total_kaidi,

        COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'male', 1, NULL)) AS thunuwa_male,
        COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'female', 1, NULL)) AS thunuwa_female,
        COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender NOT IN ('male', 'female'), 1, NULL)) AS thunuwa_other,
        COUNT(IF(bp.bandi_type = 'थुनुवा', 1, NULL)) AS total_thunuwa,

        COUNT(IF(bp.gender = 'male', 1, NULL)) AS total_male,
        COUNT(IF(bp.gender = 'female', 1, NULL)) AS total_female,
        COUNT(IF(bp.gender NOT IN ('male', 'female'), 1, NULL)) AS total_other,
        COUNT(bp.id) AS total_kaidibandi,

        COUNT(IF(bp.is_dependent = '1', 1, NULL)) AS total_aashrit,

        COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'male' AND bp.age >= ?, 1, NULL)) AS kaidi_male_65plus,
        COUNT(IF(bp.bandi_type = 'कैदी' AND bp.gender = 'female' AND bp.age >= ?, 1, NULL)) AS kaidi_female_65plus,
        COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'male' AND bp.age >= ?, 1, NULL)) AS thunuwa_male_65plus,
        COUNT(IF(bp.bandi_type = 'थुनुवा' AND bp.gender = 'female' AND bp.age >= ?, 1, NULL)) AS thunuwa_female_65plus,

        COUNT(IF(bp.country_name_np != 'नेपाल', 1, NULL)) AS foreign_count,
        GROUP_CONCAT(DISTINCT IF(bp.country_name_np != 'नेपाल', bp.country_name_np, NULL)) AS foreign_countries

      FROM offices o
      LEFT JOIN view_office_address_details voad ON o.id = voad.office_id

      LEFT JOIN (
        SELECT 
          bp.id,
          bp.gender,
          bp.bandi_type,
          bp.current_office_id,
          TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) AS age,
          bp.nationality,
          MAX(bri.is_dependent) AS is_dependent,
          MAX(vbad.country_name_np) AS country_name_np
        FROM bandi_person bp
        LEFT JOIN view_bandi_address_details vbad ON bp.id = vbad.bandi_id
        LEFT JOIN bandi_relative_info bri ON bp.id = bri.bandi_id
        LEFT JOIN bandi_kaid_details bkd ON bp.id = bkd.bandi_id
        WHERE (bkd.thuna_date_bs IS NULL OR bkd.thuna_date_bs BETWEEN ? AND ?)
        ${ extraSubqueryFilters }
        GROUP BY bp.id
      ) bp ON bp.current_office_id = o.id

      LEFT JOIN (
        SELECT bandi_id, MAX(karnayan_miti) AS karnayan_miti
        FROM bandi_release_details
        GROUP BY bandi_id
      ) brd ON brd.bandi_id = bp.id

      WHERE (
        brd.karnayan_miti IS NULL OR STR_TO_DATE(brd.karnayan_miti, '%Y-%m-%d') > STR_TO_DATE(?, '%Y-%m-%d')
      )
      AND o.office_categories_id = ?
      ${ officeFilterSql }
      GROUP BY voad.state_id, voad.district_order_id, o.letter_address, o.id
      ORDER BY voad.state_id, voad.district_order_id, o.letter_address, o.id;
    `;

        const [rows] = await pool.query( sql, params );
        return res.json( { Status: true, Result: rows } );
    } catch ( error ) {
        console.error( "Error in /get_office_wise_count:", error );
        return res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

function extractInternalAdminData( reqBody, is_active, user_id, active_office ) {
    const {
        chalani_no,
        chalani_date,
        office_id,
        appointment_start_date_bs,
        appointment_end_date_bs,
        internal_admin_post_id,
        remarks,
        bandi_id,
    } = reqBody;

    const { years, months, days } = calculateBSDate( appointment_start_date_bs, appointment_end_date_bs );

    return [
        chalani_no,
        chalani_date,
        office_id,
        appointment_start_date_bs,
        appointment_end_date_bs,
        years,
        months,
        days,
        internal_admin_post_id,
        remarks,
        bandi_id,
        is_active,
        user_id,
        active_office,
    ];
}


router.post( "/add_internal_admin", verifyToken, async ( req, res ) => {
    const user_id = req.user.username;
    const office_id = req.user.office_id;
    const { is_active } = req.body;
    const isActive = is_active ? is_active : 1;
    console.log( isActive );

    const insertSql = `
    INSERT INTO bandi_internal_admins (
      chalani_no,
      chalani_date,
      appointment_office,
      appointment_start_date_bs,
      appointment_end_date_bs,
      facility_years,
      facility_months,
      facility_days,
      internal_admin_post_id,
      remarks,
      bandi_id,
      is_active,
      created_by,
      current_office_id
    ) VALUES (?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const values = extractInternalAdminData( req.body, isActive, user_id, office_id );

    try {
        await pool.query( insertSql, values );
        res.json( { Status: true, Message: "Inserted successfully" } );
    } catch ( err ) {
        console.error( "Insert error:", err );
        res.status( 500 ).json( { Status: false, Error: "Insert failed" } );
    }
} );

router.get( "/get_all_internal_admin", verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.username;
    const subidha_id = req.query.subidha_id;
    console.log( 'subidhaid', subidha_id );
    let baseSql = `WITH prioritized_mudda AS (
    SELECT 
        bmd.bandi_id,
        m.mudda_name,
        bmd.is_main_mudda,
        bmd.is_last_mudda,
        ROW_NUMBER() OVER (
            PARTITION BY bmd.bandi_id 
            ORDER BY 
                CASE 
                    WHEN bmd.is_main_mudda = 1 AND bmd.is_last_mudda = 1 THEN 1
                    WHEN bmd.is_last_mudda = 1 THEN 2
                    ELSE 3
                END,
                bmd.id DESC
        ) AS rn
    FROM bandi_mudda_details bmd
    LEFT JOIN muddas m ON bmd.mudda_id = m.id
)
SELECT 
    bia.id AS bia_id,
    bia.chalani_no,
    bia.chalani_date,
    bia.appointment_office,
    bia.appointment_start_date_bs,
    bia.appointment_end_date_bs,
    bia.facility_years,
    bia.facility_months,
    bia.facility_days,
    bia.internal_admin_post_id,
    bia.remarks,
    bia.is_active,

    bp.id AS bandi_id,
    bp.bandi_name,

    o.office_name_with_letter_address AS current_office,
    oo.office_name_with_letter_address AS office_name,

    bad.nepali_address,
    bad.bidesh_nagarik_address_details,

    bkd.hirasat_years, bkd.hirasat_months, bkd.hirasat_days, 
    bkd.thuna_date_bs, bkd.release_date_bs,

    pm.mudda_name AS mudda_name

FROM bandi_internal_admins bia
LEFT JOIN bandi_person bp ON bia.bandi_id = bp.id
LEFT JOIN offices o ON bia.current_office_id = o.id
LEFT JOIN offices oo ON bia.appointment_office = oo.id
LEFT JOIN view_bandi_address_details bad ON bia.bandi_id = bad.bandi_id
LEFT JOIN bandi_kaid_details bkd ON bkd.bandi_id = bp.id

-- This gives you the one prioritized mudda per bandi
LEFT JOIN prioritized_mudda pm ON pm.bandi_id = bp.id AND pm.rn = 1

    `;
    let sql;
    if ( active_office == 1 || active_office == 2 ) {
        sql = `${ baseSql }`;
    } else {
        sql = `${ baseSql }` + ` WHERE bia.current_office_id=${ active_office }`;
    }

    if ( subidha_id ) {
        sql += ` AND bia.id=${ subidha_id }`;
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const [result] = await connection.query( sql );
        if ( result.length > 0 ) {
            return res.json( { Status: true, Result: result } );
        } else {
            return res.json( { Status: false, Error: 'No records found' } );
        }
    } catch ( error ) {
        if ( connection ) connection.release();
        console.error( 'Database query error:', error );
        return res.status( 500 ).json( { Status: false, Error: 'Database query failed' } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.put( "/update_internal_admin1/:id", verifyToken, async ( req, res ) => {
    const user_office_id = req.user.office_id;
    const user_id = req.user.username;
    const id = req.params.id;
    try {
        await beginTransactionAsync();
        const [existing] = await pool.query(
            `SELECT * FROM bandi_internal_admins WHERE id = ?`,
            [id]
        );

        if ( existing.length > 0 ) {
            const values = extractInternalAdminData( req.body, isActive, user_id, office_id, id );
            await pool.query( sql, values );
        }

        await commitAsync();
        return res.json( { Status: true, Message: "Updated successfully" } );
    } catch ( error ) {
        await rollbackAsync();
        console.error( "Payrole update error:", error );
        return res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.post( "/create_release_bandi", verifyToken, async ( req, res ) => {
    const user_id = req.user.username;
    const active_office = req.user.office_id;
    const created_at = new Date();
    // console.log(req.body)
    console.log( created_at );
    const { reason_id, decision_date, apply_date, nirnay_officer, aafanta_id, relative_id, remarks, bandi_id } = req.body;

    const insertSql = `
    INSERT INTO bandi_release_details (
      bandi_id,
      reason_id,
      nirnay_miti,
      karnayan_miti,
      nirnay_officer,
      aafanta_id,
      remarks,
      created_by,
      created_at,
      current_office_id
    ) VALUES (?, ?, ?, ?,?, ?, ?, ?, ?, ?)
  `;
    const values = [bandi_id, reason_id, decision_date, apply_date, nirnay_officer, aafanta_id, remarks, user_id, created_at, active_office];
    let connection;
    try {
        connection = await pool.getConnection();
        // beginTransactionAsync();
        // await pool.query( insertSql, values );
        await connection.beginTransaction();
        await connection.query( insertSql, values );

        // await pool.query( `UPDATE bandi_person SET is_active=0 WHERE id=${ bandi_id }` );
        // await commitAsync();
        await connection.query( `UPDATE bandi_person SET is_active=0 WHERE id=${ bandi_id }` );
        await connection.commit();
        res.json( { Status: true, Message: "Inserted successfully" } );
    } catch ( err ) {
        await connection.rollback();
        console.error( "Insert error:", err );
        res.status( 500 ).json( { Status: false, Error: "Insert failed" } );
    } finally {
        if ( connection ) connection.release();
    }
} );

router.get( '/get_prisioners_count', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;

    const {
        startDate,
        endDate,
        nationality,
        ageFrom,
        ageTo,
        office_id // optional for super admin
    } = req.query;

    // Parameters for SQL binding
    const params = [startDate, endDate, startDate, endDate];
    const filters = [];

    const baseSql = `
        SELECT 
            m.mudda_name,
            COUNT(DISTINCT bp.id) AS Total,

            -- कैदी
            SUM(CASE WHEN bp.is_active = 1 AND bp.bandi_type = 'कैदी' THEN 1 ELSE 0 END) AS KaidiTotal,
            SUM(CASE WHEN bp.is_active = 1 AND bp.bandi_type = 'कैदी' AND bp.gender = 'Male' THEN 1 ELSE 0 END) AS KaidiMale,
            SUM(CASE WHEN bp.is_active = 1 AND bp.bandi_type = 'कैदी' AND bp.gender = 'Female' THEN 1 ELSE 0 END) AS KaidiFemale,

            -- थुनुवा
            SUM(CASE WHEN bp.is_active = 1 AND bp.bandi_type = 'थुनुवा' THEN 1 ELSE 0 END) AS ThunuwaTotal,
            SUM(CASE WHEN bp.is_active = 1 AND bp.bandi_type = 'थुनुवा' AND bp.gender = 'Male' THEN 1 ELSE 0 END) AS ThunuwaMale,
            SUM(CASE WHEN bp.is_active = 1 AND bp.bandi_type = 'थुनुवा' AND bp.gender = 'Female' THEN 1 ELSE 0 END) AS ThunuwaFemale,

            -- 65+ उम्र
            SUM(CASE WHEN bp.is_active = 1 AND bp.bandi_type = 'थुनुवा' AND TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) >= 65 THEN 1 ELSE 0 END) AS ThunuwaAgeAbove65,
            SUM(CASE WHEN bp.is_active = 1 AND bp.bandi_type = 'कैदी' AND TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) >= 65 THEN 1 ELSE 0 END) AS KaidiAgeAbove65,

            -- गिरफ्तारी / छुटे
            SUM(CASE WHEN bkd.thuna_date_bs BETWEEN ? AND ? THEN 1 ELSE 0 END) AS TotalArrestedInDateRange,
            SUM(CASE WHEN bkd.release_date_bs BETWEEN ? AND ? THEN 1 ELSE 0 END) AS TotalReleasedInDateRange

        FROM bandi_person bp
       -- LEFT JOIN bandi_mudda_details bmd ON bp.id = bmd.bandi_id
       LEFT JOIN (
            SELECT *
            FROM (
                SELECT bmd.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY bmd.bandi_id 
                        ORDER BY bmd.created_at DESC
                    ) AS rn
                FROM bandi_mudda_details bmd
            ) AS ranked_mudda
            WHERE ranked_mudda.rn = 1
            AND (
                (is_main_mudda = 1 AND is_last_mudda = 1) OR
                (is_main_mudda = 1 AND is_last_mudda = 0) OR
                (is_main_mudda = 0 AND is_last_mudda = 1) OR
                (is_main_mudda = 0 AND is_last_mudda = 0)
            )
        ) AS bmd ON bp.id = bmd.bandi_id
        LEFT JOIN muddas m ON bmd.mudda_id = m.id
        LEFT JOIN offices o ON bp.current_office_id = o.id
        LEFT JOIN bandi_kaid_details bkd ON bp.id = bkd.bandi_id
    `;

    // Only include main and last mudda to avoid duplicates
    filters.push( "bp.is_active = 1" );
    // filters.push(
    //     "(bmd.is_main_mudda = 1 AND bmd.is_last_mudda = 1) OR (bmd.is_main_mudda = 1 AND bmd.is_last_mudda = 0) OR (bmd.is_main_mudda = 0 AND bmd.is_last_mudda = 1) OR (bmd.is_main_mudda=0 AND bmd.is_last_mudda=0)"
    // );
    // filters.push( "bmd.is_last_mudda = 1" );

    // Age filter
    if ( ageFrom && ageTo ) {
        filters.push( "TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) BETWEEN ? AND ?" );
        params.push( Number( ageFrom ), Number( ageTo ) );
    }

    // Nationality filter
    if ( nationality ) {
        filters.push( "bp.nationality = ?" );
        params.push( nationality.trim() );
    }

    if ( active_office == 1 || active_office == 2 ) {
        if ( office_id ) {
            filters.push( "bp.current_office_id=?" );
            params.push( office_id );
        } else {
            filters.push( 1 == 1 );
        }
    } else {
        filters.push( "bp.current_office_id=?" );
        params.push( active_office );
    }

    // if ( office_id ) {
    //     filters.push( "bp.current_office_id = ?" );
    //     params.push( office_id );
    // } else {
    //     if ( active_office == 1 || active_office == 2 ) {
    //         filters.push( 1 == 1 );
    //     }
    // }

    const whereClause = filters.length ? `WHERE ${ filters.join( " AND " ) }` : '';

    const finalSql = `
        ${ baseSql }
        ${ whereClause }
        GROUP BY m.id, m.mudda_name
        HAVING 
            KaidiTotal > 0 OR 
            ThunuwaTotal > 0 OR 
            TotalArrestedInDateRange > 0 OR 
            TotalReleasedInDateRange > 0
        ORDER BY m.mudda_name ASC
    `;
    try {
        const [result] = await pool.query( finalSql, params );
        res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_prisioners_count_for_maskebari', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const today_date_bs = new NepaliDate().format( 'YYYY-MM-DD' );

    let {
        startDate,
        endDate,
        nationality,
        ageFrom,
        ageTo,
        office_id // for super admin
    } = req.query;

    const filters = ['bp.is_active = 1'];
    const params = [];

    // Default date logic
    if ( !startDate && !endDate ) {
        startDate = '0000-00-00';
        endDate = today_date_bs;
    } else if ( !startDate ) {
        startDate = '0000-00-00';
    } else if ( !endDate ) {
        endDate = today_date_bs;
    }

    filters.push( `bkd.thuna_date_bs <= ?` );
    filters.push( `(brd.karnayan_miti IS NULL OR brd.karnayan_miti >= ?)` );

    params.push( endDate, startDate );

    if ( nationality && nationality.trim() !== '' ) {
        filters.push( `bp.nationality = ?` );
        params.push( nationality.trim() );
    }

    // Office filter logic
    if ( active_office === 1 || active_office === 2 ) {
        if ( office_id && office_id.trim() !== '' ) {
            const parsedOfficeId = parseInt( office_id, 10 );
            if ( !isNaN( parsedOfficeId ) ) {
                filters.push( `bp.current_office_id = ?` );
                params.push( parsedOfficeId );
            }
        }
        // else no office filter (all offices for super admin)
    } else {
        filters.push( `bp.current_office_id = ?` );
        params.push( active_office );
    }

    // Optional: age filter
    if ( ageFrom && ageTo ) {
        filters.push( `TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) BETWEEN ? AND ?` );
        params.push( Number( ageFrom ), Number( ageTo ) );
    }

    const baseSql = `
        SELECT 
            mg.mudda_group_name AS mudda_name,
            COUNT(DISTINCT bp.id) AS Total,

            -- कैदी
            SUM(CASE WHEN bp.bandi_type = 'कैदी' THEN 1 ELSE 0 END) AS KaidiTotal,
            SUM(CASE WHEN bp.bandi_type = 'कैदी' AND bp.gender = 'Male' THEN 1 ELSE 0 END) AS KaidiMale,
            SUM(CASE WHEN bp.bandi_type = 'कैदी' AND bp.gender = 'Female' THEN 1 ELSE 0 END) AS KaidiFemale,

            -- थुनुवा
            SUM(CASE WHEN bp.bandi_type = 'थुनुवा' THEN 1 ELSE 0 END) AS ThunuwaTotal,
            SUM(CASE WHEN bp.bandi_type = 'थुनुवा' AND bp.gender = 'Male' THEN 1 ELSE 0 END) AS ThunuwaMale,
            SUM(CASE WHEN bp.bandi_type = 'थुनुवा' AND bp.gender = 'Female' THEN 1 ELSE 0 END) AS ThunuwaFemale,

            -- 65+ उम्र
            SUM(CASE WHEN bp.bandi_type = 'थुनुवा' AND TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) >= 65 THEN 1 ELSE 0 END) AS ThunuwaAgeAbove65,
            SUM(CASE WHEN bp.bandi_type = 'कैदी' AND TIMESTAMPDIFF(YEAR, bp.dob_ad, CURDATE()) >= 65 THEN 1 ELSE 0 END) AS KaidiAgeAbove65

        FROM bandi_person bp
        LEFT JOIN (
                SELECT bandi_id, MAX(karnayan_miti) AS karnayan_miti
                FROM bandi_release_details
                GROUP BY bandi_id
                ) brd ON brd.bandi_id = bp.id
        LEFT JOIN (
            SELECT *
            FROM (
                SELECT bmd.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY bmd.bandi_id 
                        ORDER BY bmd.created_at DESC
                    ) AS rn
                FROM bandi_mudda_details bmd
            ) AS ranked_mudda
            WHERE ranked_mudda.rn = 1
        ) AS bmd ON bp.id = bmd.bandi_id
        LEFT JOIN muddas m ON bmd.mudda_id = m.id
        LEFT JOIN muddas_groups mg ON m.muddas_group_id = mg.id
        LEFT JOIN offices o ON bp.current_office_id = o.id
        LEFT JOIN bandi_kaid_details bkd ON bp.id = bkd.bandi_id
        ${ filters.length ? 'WHERE ' + filters.join( ' AND ' ) : '' }
        GROUP BY mg.id, mg.mudda_group_name
        HAVING Total > 0
        ORDER BY mg.mudda_group_name ASC
    `;

    try {
        const [result] = await pool.query( baseSql, params );
        res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( "/get_total_of_all_maskebari_fields", verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const isSuperOffice = active_office === 1 || active_office === 2;
    const officeCondition = isSuperOffice ? "1=1" : "bp.current_office_id = ?";
    const officeParams = isSuperOffice ? [] : [active_office];

    const TRANSFER_REASON_ID = 7; // Replace with real value
    const DEATH_REASON_ID = 8;    // Replace with real value

    // console.log( current_date );

    const queries = {
        previousMonthCount: `
            SELECT gender, COUNT(*) AS count
            FROM bandi_person bp
            LEFT JOIN bandi_kaid_details bkd ON bp.id=bkd.bandi_id
            WHERE bp.is_active = 1
              AND ${ officeCondition }
              AND DATE_FORMAT(STR_TO_DATE(bkd.thuna_date_bs, '%Y-%m-%d'), '%Y-%m') <= '2081-02'
            GROUP BY gender`,

        addedThisMonth: `
            SELECT gender, COUNT(*) AS count
            FROM bandi_person bp
            WHERE bp.is_active = 1
              AND ${ officeCondition }
              AND LEFT(bp.created_at, 10) BETWEEN bs2ad('2081-03-01') AND bs2ad('2081-03-32')
            GROUP BY gender`,

        releasedThisMonth: `
            SELECT bp.gender, COUNT(*) AS count
            FROM bandi_release_details br
            JOIN bandi_person bp ON br.bandi_id = bp.id
            WHERE LEFT(br.nirnay_miti, 7) = '2081-03'
              AND ${ officeCondition }
            GROUP BY bp.gender`,

        transferredThisMonth: `
            SELECT bp.gender, COUNT(*) AS count
            FROM bandi_release_details br
            JOIN bandi_person bp ON br.bandi_id = bp.id
            WHERE LEFT(br.karnayan_miti, 7) = '2081-03'
              AND br.reason_id = ?
              AND ${ officeCondition }
            GROUP BY bp.gender`,

        deathThisMonth: `
            SELECT bp.gender, COUNT(*) AS count
            FROM bandi_release_details br
            JOIN bandi_person bp ON br.bandi_id = bp.id
            WHERE LEFT(br.karnayan_miti, 7) = '2081-03'
              AND br.reason_id = ?
              AND ${ officeCondition }
            GROUP BY bp.gender`,

        totalThisMonth: `
            SELECT gender, COUNT(*) AS count
            FROM bandi_person bp
            WHERE bp.is_active = 1
              AND ${ officeCondition }
            GROUP BY gender`,

        aashritThisMonth: `
            SELECT bp.gender, COUNT(*) AS count
            FROM aashrit_table a
            JOIN bandi_person bp ON a.bandi_id = bp.id
            WHERE ${ officeCondition }
            GROUP BY bp.gender`
    };

    try {
        const [previousMonthCount] = await query( queries.previousMonthCount, officeParams );
        const [addedThisMonth] = await query( queries.addedThisMonth, officeParams );
        const [releasedThisMonth] = await query( queries.releasedThisMonth, officeParams );
        const [transferredThisMonth] = await query( queries.transferredThisMonth, [TRANSFER_REASON_ID, ...officeParams] );
        const [deathThisMonth] = await query( queries.deathThisMonth, [DEATH_REASON_ID, ...officeParams] );
        const [totalThisMonth] = await query( queries.totalThisMonth, officeParams );
        const [aashritThisMonth] = await query( queries.aashritThisMonth, officeParams );

        return res.json( {
            Status: true,
            Result: {
                previousMonthCount,
                addedThisMonth,
                releasedThisMonth,
                transferredThisMonth,
                deathThisMonth,
                totalThisMonth,
                aashritThisMonth
            }
        } );
    } catch ( error ) {
        console.error( "DB Error:", error );
        return res.status( 500 ).json( { Status: false, Error: "Database query failed." } );
    }
} );

router.get( "/released_bandi_count", verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const targetOffice = req.query.office_id || active_office;
    const officeParams = [targetOffice];

    const todayBS = new NepaliDate().format( "YYYY-MM-DD" );
    const fy = new NepaliDate().format( "YYYY" );
    const fyStart = `${ fy - 1 }-04-01`;

    const from_date_bs = req.query.from_date || fyStart;
    const to_date_bs = req.query.to_date || todayBS;
    const currentMonth = todayBS.slice( 0, 7 );
    const monthStart = `${ currentMonth }-01`;

    const formatGenderCounts = ( rows, base = { Male: 0, Female: 0, Other: 0 } ) => {
        const counts = { ...base };
        rows.forEach( ( { gender, count } ) => {
            if ( gender && counts.hasOwnProperty( gender ) ) {
                counts[gender] += Number( count );
            }
        } );
        counts.Total = counts.Male + counts.Female + counts.Other;
        return counts;
    };

    try {
        // 📤 Original release reasons
        const releaseSql = `
      WITH reasons AS (
  SELECT id AS reason_id, reasons_np FROM bandi_release_reasons
),
genders AS (
  SELECT 'Male' AS gender
  UNION ALL SELECT 'Female'
  UNION ALL SELECT 'Other'
),
periods AS (
  SELECT 'this_month' AS period
  UNION ALL SELECT 'till_last_month'
),
reason_gender_periods AS (
  SELECT r.reason_id, r.reasons_np, g.gender, p.period
  FROM reasons r
  CROSS JOIN genders g
  CROSS JOIN periods p
),
actual_counts AS (
  SELECT 
    brd.reason_id,
    bp.gender,
    CASE 
      WHEN LEFT(brd.karnayan_miti, 7) = ? THEN 'this_month'
      ELSE 'till_last_month'
    END AS period,
    COUNT(*) AS count
  FROM bandi_release_details brd
  JOIN bandi_person bp ON brd.bandi_id = bp.id
  WHERE brd.karnayan_miti IS NOT NULL
    AND bp.is_active = 0
    AND bp.current_office_id = ?
    AND brd.karnayan_miti BETWEEN ? AND ?
  GROUP BY brd.reason_id, bp.gender, period
)
SELECT 
  rgp.reason_id,
  rgp.reasons_np,
  rgp.gender,
  rgp.period,
  COALESCE(ac.count, 0) AS count
FROM reason_gender_periods rgp
LEFT JOIN actual_counts ac ON
  rgp.reason_id = ac.reason_id AND
  rgp.gender = ac.gender AND
  rgp.period = ac.period
ORDER BY rgp.reason_id, rgp.gender, rgp.period;
    `;

        const [releaseResults] = await pool.query( releaseSql, [
            currentMonth,
            ...officeParams,
            from_date_bs,
            to_date_bs
        ] );

        const formatted = {};

        releaseResults.forEach( ( { reason_id, reasons_np, gender, count, period } ) => {
            if ( !formatted[reason_id] ) {
                formatted[reason_id] = {
                    reason_id,
                    reason: reasons_np,
                    till_last_month: { Male: 0, Female: 0, Other: 0, Total: 0 },
                    this_month: { Male: 0, Female: 0, Other: 0, Total: 0 }
                };
            }
            formatted[reason_id][period][gender] = count;
            formatted[reason_id][period].Total =
                ( formatted[reason_id][period].Male || 0 ) +
                ( formatted[reason_id][period].Female || 0 ) +
                ( formatted[reason_id][period].Other || 0 );
        } );

        // 🔄 New aggregates
        const [
            activeBeforeThisMonth,
            releasedThisMonth,
            addedThisMonth,
            dependentActive
        ] = await Promise.all( [
            query( `
        SELECT bp.gender, COUNT(*) AS count
        FROM bandi_person bp
        LEFT JOIN bandi_kaid_details bkd ON bp.id = bkd.bandi_id
        WHERE bp.is_active = 1 AND bp.current_office_id = ?
          AND LEFT(bkd.thuna_date_bs, 7) < ?
        GROUP BY bp.gender;
      `, [targetOffice, currentMonth] ),

            query( `
        SELECT bp.gender, COUNT(*) AS count
        FROM bandi_release_details brd
        JOIN bandi_person bp ON bp.id = brd.bandi_id
        WHERE bp.current_office_id = ?
          AND LEFT(brd.karnayan_miti, 7) = ?
        GROUP BY bp.gender;
      `, [targetOffice, currentMonth] ),

            query( `
        SELECT bp.gender, COUNT(*) AS count
        FROM bandi_person bp
        JOIN bandi_kaid_details bkd ON bp.id = bkd.bandi_id
        WHERE bp.current_office_id = ?
          AND bkd.thuna_date_bs BETWEEN ? AND ?
        GROUP BY bp.gender;
      `, [targetOffice, monthStart, to_date_bs] ),

            query( `
        SELECT bp.gender, COUNT(*) AS count
        FROM bandi_person bp
        JOIN bandi_relative_info bri ON bp.id = bri.bandi_id
        WHERE bp.current_office_id = ?
          AND bp.is_active = 1
          AND bri.is_dependent = 1
        GROUP BY bp.gender;
      `, [targetOffice] )
        ] );

        // 🧩 Add to unified output for reason_ids 9, 10, 11
        formatted[9] = {
            reason_id: 9,
            reason: "Active Count Till Last Month", // Custom reason for reason_id 8
            till_last_month: formatGenderCounts( [...activeBeforeThisMonth, ...releasedThisMonth] ),
            this_month: formatGenderCounts( [] )
        };

        formatted[10] = {
            reason_id: 10,
            reason: "Added This Month", // Custom reason for reason_id 9
            till_last_month: formatGenderCounts( [] ),
            this_month: formatGenderCounts( addedThisMonth )
        };

        formatted[11] = {
            reason_id: 11,
            reason: "Dependent Active", // Custom reason for reason_id 10
            till_last_month: formatGenderCounts( dependentActive ),
            this_month: formatGenderCounts( [] )
        };

        res.json( {
            Status: true,
            from_date: from_date_bs,
            to_date: to_date_bs,
            Result: formatted
        } );
    } catch ( err ) {
        console.error( "DB Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Query failed" } );
    }
} );

router.post( '/create_mudda', verifyToken, async ( req, res ) => {
    const user_id = req.user.username;
    const office_id = req.user.office_id;
    const data = req.body;

    const insertSql = `
    INSERT INTO muddas (
      mudda_name,
      muddas_group_id,    
      created_by,
      updated_by,
      current_office_id
    ) VALUES (?, ?, ?, ?,?)
  `;

    const values = [req.body.mudda_name, req.body.mudda_group_id, user_id, user_id, office_id];

    try {
        await pool.query( insertSql, values );
        res.json( { Status: true, Message: "Inserted successfully" } );
    } catch ( err ) {
        console.error( "Insert error:", err );
        res.status( 500 ).json( { Status: false, Error: "Insert failed" } );
    }
} );


export { router as bandiRouter };