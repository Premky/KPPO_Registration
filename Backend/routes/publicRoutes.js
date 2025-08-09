import express from 'express';
import con from '../utils/db.js';
import pool from '../utils/db3.js';
// import con2 from '../utils/db2.js';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import NepaliDate from 'nepali-datetime';

import verifyToken from '../middlewares/verifyToken.js';

const router = express.Router();
const query = promisify( con.query ).bind( con );
const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

import NepaliDateConverter from 'nepali-date-converter';
const current_date = new NepaliDate().format( 'YYYY-MM-DD' );
const fy = new NepaliDate().format( 'YYYY' ); //Support for filter
const fy_date = fy + '-04-01';
// console.log(current_date);
router.get( "/get_offices", async ( req, res ) => {
    const sql = `SELECT * from offices ORDER BY office_name_with_letter_address`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result, message: 'Records fetched successfully.' } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_all_punarabedan_offices', async ( req, res ) => {
    const sql = `SELECT * from offices WHERE office_categories_id=5 ORDER BY letter_address`;
    try {
        const [result] = await pool.query( sql );
        // console.log(result)
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_parole_nos/', async ( req, res ) => {
    const { id } = req.params;
    const sql = `SELECT * FROM payrole_nos`;

    pool.query( sql, ( err, result ) => {
        // console.log(result)
        if ( err ) return res.json( { Status: false, Error: "Query Error" } );
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Parole Nos not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } );

} );
router.get( '/get_character_conditions', async ( req, res ) => {
    const sql = `SELECT * FROM character_conditions`;

    try {
        const [result] = await pool.query( sql );

        if ( result.length === 0 ) {
            return res.json( {
                Status: false,
                Error: "No character conditions found",
            } );
        }

        return res.json( {
            Status: true,
            Result: result,
        } );
    } catch ( err ) {
        console.error( "Query Error:", err );
        return res.status( 500 ).json( {
            Status: false,
            Error: "Query Error",
        } );
    }
} );

router.get( '/get_all_user_roles', async ( req, res ) => {
    const sql = `SELECT * FROM user_roles WHERE role_name_np IS NOT NULL AND is_process=1 `;

    try {
        const [result] = await pool.query( sql );

        if ( result.length === 0 ) {
            return res.json( {
                Status: false,
                Error: "No character conditions found",
            } );
        }

        return res.json( {
            Status: true,
            Result: result,
        } );
    } catch ( err ) {
        console.error( "Query Error:", err );
        return res.status( 500 ).json( {
            Status: false,
            Error: "Query Error",
        } );
    }
} );

router.get( '/get_in_process_user_roles', async ( req, res ) => {
    const sql = `SELECT * FROM user_roles WHERE role_name_np IS NOT NULL AND is_process=1 `;

    try {
        const [result] = await pool.query( sql );

        if ( result.length === 0 ) {
            return res.json( {
                Status: false,
                Error: "No character conditions found",
            } );
        }

        return res.json( {
            Status: true,
            Result: result,
        } );
    } catch ( err ) {
        console.error( "Query Error:", err );
        return res.status( 500 ).json( {
            Status: false,
            Error: "Query Error",
        } );
    }
} );

router.get( '/get_parole_status/', async ( req, res ) => {
    const { id } = req.params;
    const sql = `SELECT * FROM parole_status`;

    pool.query( sql, id, ( err, result ) => {
        if ( err ) return res.json( { Status: false, Error: "Query Error" } );
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Parole Status not found" } );
        }
        return res.json( { Status: true, Result: result[0] } );
    } );

} );

router.get( '/get_id_cards', async ( req, res ) => {
    const sql = `SELECT * FROM govt_id_types`;
    try {
        const [result] = await pool.query( sql );
        // console.log(result)
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_id_cards1/', async ( req, res ) => {
    const sql = `SELECT * FROM govt_id_types`;

    await pool.query( sql, ( err, result ) => {
        if ( err ) return res.json( { Status: false, Error: "Query Error" } );
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "ID Cards not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } );
} );

router.get( '/get_relations/', async ( req, res ) => {
    const sql = `SELECT * FROM relationships`;
    try {
        const [result] = await pool.query( sql );
        // console.log(result)
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_bandi_release_reasons1/', async ( req, res ) => {
    const sql = `SELECT * FROM bandi_release_reasons`;

    pool.query( sql, ( err, result ) => {
        if ( err ) return res.json( { Status: false, Error: "Query Error" } );
        if ( result.length === 0 ) {
            return res.json( { Status: false, Error: "Bandi release reasons not found" } );
        }
        return res.json( { Status: true, Result: result } );
    } );
} );

router.get( '/get_bandi_release_reasons/', async ( req, res ) => {
    const sql = `SELECT * FROM bandi_release_reasons`;
    try {
        const [result] = await pool.query( sql );
        // console.log(result)
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_bandi_transfer_reasons/', async ( req, res ) => {
    const sql = `SELECT * FROM bandi_transfer_reasons`;
    try {
        const [result] = await pool.query( sql );
        // console.log(result)
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_fine_types/', async ( req, res ) => {
    const sql = `SELECT * FROM fine_types`;
    try {
        const [result] = await pool.query( sql );
        // console.log(result)
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

// router.get( '/get_fine_types1/', async ( req, res ) => {
//     const sql = `SELECT * FROM fine_types`;

//     pool.query( sql, ( err, result ) => {
//         if ( err ) return res.json( { Status: false, Error: "Query Error" } );
//         if ( result.length === 0 ) {
//             return res.json( { Status: false, Error: "Bandi release reasons not found" } );
//         }
//         return res.json( { Status: true, Result: result } );
//     } );

// } );

router.get( '/get_diseases', async ( req, res ) => {
    const sql = `SELECT * from diseases ORDER BY id`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_disabilities', async ( req, res ) => {
    const sql = `SELECT * from disabilities ORDER BY id`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/muddas_groups', async ( req, res ) => {
    const sql = `SELECT * from muddas_groups ORDER BY id`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

// const queryAsync = promisify( con.query ).bind( con );


router.get( '/get_countries', async ( req, res ) => {
    const sql = `SELECT * from np_country ORDER BY id`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_states', async ( req, res ) => {
    const sql = `SELECT * from np_state ORDER BY state_id`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_districts', async ( req, res ) => {
    const sql = `SELECT * from np_district ORDER BY did`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_municipalities', async ( req, res ) => {
    const sql = `SELECT * from np_city ORDER BY cid`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_bandi_type', async ( req, res ) => {
    const sql = `SELECT * from bandi_types`;
    try {
        const [result] = await pool.query( sql );

        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_mudda', async ( req, res ) => {
    const sql = `SELECT * from muddas ORDER BY mudda_name`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );
router.get( '/get_mudda_groups', async ( req, res ) => {
    const sql = `SELECT * from muddas_groups ORDER BY mudda_group_name`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_payrole_nos', async ( req, res ) => {
    const sql = `SELECT * from payrole_nos ORDER BY -id`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_payrole_status', async ( req, res ) => {
    const sql = `SELECT * from payrole_status ORDER BY id`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_bandi_ranks/', async ( req, res ) => {

    const sql = `SELECT * FROM bandi_posts `;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.get( '/get_usertypes/', async ( req, res ) => {
    // const {reason_type} = req.params;
    const sql = `SELECT * FROM usertypes;`;
    try {
        const [result] = await pool.query( sql );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );


router.get( '/currentoffice/:id', ( req, res ) => {
    const { id } = req.params;
    const sql = "SELECT * FROM office WHERE id=?";
    pool.query( sql, id, ( err, result ) => {
        if ( err ) return res.json( { Status: false, Error: "Query Error" } );
        return res.json( { Status: true, Result: result } );
    } );
} );

router.get( '/leavetypes', ( req, res ) => {
    const sql = "SELECT * FROM leave_type";
    pool.query( sql, ( err, result ) => {
        if ( err ) return res.json( { Status: false, Error: "Query Error" } );
        return res.json( { Status: true, Result: result } );
    } );
} );

//Search PMIS
router.get( '/search_pmis', ( req, res ) => {
    const pmis = req.query.pmis;
    // console.log(pmis)
    const handleResponse = ( err, result, errorMsg ) => {
        if ( err ) {
            return res.json( { Status: false, Error: errorMsg } );
        }
        if ( result && result.length > 0 ) {
            return res.json( { Status: true, Result: result } );
        } else {
            return res.json( { Status: false, Error: "No records found" } );
        }
    };

    // const sql = `SELECT e.*, r.rank_np AS rank, o.office_name 
    //             FROM employee e
    //             JOIN ranks r ON e.rank = r.rank_id
    //             JOIN office o ON e.working = o.o_id
    //             WHERE pmis = ?`;
    const sql = `SELECT e.*, r.rank_np AS rank
                FROM employee e
                JOIN ranks r ON e.rank = r.rank_id                
                WHERE pmis = ?`;
    pool.query( sql, [pmis], ( err, result ) => {
        return handleResponse( err, result, "Query Error" );
    } );
} );



export { router as publicRouter };