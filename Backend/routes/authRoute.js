import express from 'express';
import con, { promiseCon } from '../utils/db.js';
import pool from '../utils/db3.js';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import argon2 from 'argon2';
import crypto from "crypto";
import session from 'express-session';
import verifyToken from '../middlewares/verifyToken.js';

const router = express.Router();

const queryAsync = promisify( con.query ).bind( con );
const beginTransactionAsync = promisify( con.beginTransaction ).bind( con );
const commitAsync = promisify( con.commit ).bind( con );
const rollbackAsync = promisify( con.rollback ).bind( con );
const query = promisify( con.query ).bind( con );

// Function to hash passwords
const hashPasswordUsingBcrypt = async ( password ) => {
    const salt = await bcrypt.genSalt( 10 );
    return await bcrypt.hash( password, salt );
};


async function hashPasswordUsingArgon( password ) {
    try {
        const hash = await argon2.hash( password, {
            type: argon2.argon2id, // Most secure variant (mixes Argon2i and Argon2d)
            memoryCost: 2 ** 16,   // 64 MB
            timeCost: 3,           // Iterations
            parallelism: 1         // Threads
        } );
        console.log( "Hashed Password:", hash );
        return hash;
    } catch ( err ) {
        console.error( "Hashing error:", err );
    }
}

async function verifyPasswordUsingArgon( hash, plainPassword ) {
    try {
        if ( await argon2.verify( hash, plainPassword ) ) {
            console.log( "✅ Password match" );
            return true;
        } else {
            console.log( "❌ Wrong password" );
            return false;
        }
    } catch ( err ) {
        console.error( "Verification error:", err );
    }
}

// Helper: Verify Django PBKDF2 SHA256 password
function verifyPBKDF2( password, djangoHash ) {
    try {
        const parts = djangoHash.split( '$' );
        if ( parts.length !== 4 || parts[0] !== 'pbkdf2_sha256' ) {
            return false;
        }

        const iterations = parseInt( parts[1], 10 );
        const salt = parts[2];
        const storedHash = parts[3];

        // Hash with PBKDF2 SHA256
        const hashBuffer = crypto.pbkdf2Sync( password, salt, iterations, 32, 'sha256' );
        const hashBase64 = hashBuffer.toString( 'base64' );

        return crypto.timingSafeEqual( Buffer.from( hashBase64, 'utf8' ), Buffer.from( storedHash, 'utf8' ) );
    } catch ( err ) {
        console.error( "PBKDF2 verification error:", err );
        return false;
    }
}
// Validate Login Input
const validateLoginInput = ( username, password ) => {
    if ( !username || !password ) {
        return { isValid: false, message: "Username and Password are required." };
    }
    return { isValid: true };
};

// Create User Route
router.post( "/create_user", verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_user = req.user.id;
    let current_office;
    try {
        const { name_np, username, usertype, userrole, password, repassword, office, branch, is_active } = req.body;
        if ( office == '' || office == null || office == undefined ) {
            current_office = active_office;
        } else {
            current_office = office;
        }
        if ( !name_np || !username || !password || !repassword || !office ) {
            return res.status( 400 ).json( { message: "सबै फिल्डहरू आवश्यक छन्।" } );
        }

        if ( password !== repassword ) {
            return res.status( 400 ).json( { message: "पासवर्डहरू मिलेन।" } );
        }

        const existingUser = await query( "SELECT id FROM users WHERE user_login_id = ?", [username] );
        if ( existingUser.length > 0 ) {
            return res.status( 400 ).json( { message: "यो प्रयोगकर्ता नाम पहिल्यै अवस्थित छ।" } );
        }

        // const hashedPassword = await hashPasswordUsingBcrypt( password );
        const hashedPassword = await hashPasswordUsingArgon( password );
        const sql = `
            INSERT INTO users (user_name, user_login_id, role_id,  password, office_id, branch_id, is_active,
            created_by, updated_by, created_at, updated_at,created_office_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        try {
            const result = await pool.query( sql, [name_np, username, userrole, hashedPassword, current_office, branch, is_active,
                active_user, active_user, new Date(), new Date(), active_office
            ] );
            return res.json( { Status: true, Result: result } );
        } catch ( err ) {
            console.error( "Database Query Error:", err );
            res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
        }
    } catch ( error ) {
        console.error( "User creation error:", error );
        res.status( 500 ).json( { message: "सर्भर त्रुटि भयो।" } );
    }
} );

// Get Users Route
router.get( '/get_users', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_user = req.user.id;
    const active_role = req.user.role_name;

    if ( active_role !== 'superadmin' && active_role !== 'office_superadmin' ) {
        return res.json( { Status: false, message: 'Access Denied!!!' } );
    }

    let filters = '';
    let params = [];

    if ( active_role === 'office_superadmin' ) {
        filters = 'WHERE u.office_id = ?';
        params.push( active_office );
    }
    const sql = `
        SELECT 
            u.*, 
            ur.role_name AS usertype_en, 
            o.office_name_with_letter_address, 
            b.branch_np,
            e.mobile_no
        FROM users u
        LEFT JOIN user_roles ur ON u.role_id = ur.id
        LEFT JOIN offices o ON u.office_id = o.id
        LEFT JOIN branch b ON u.branch_id = b.id
        LEFT JOIN employees e ON u.user_login_id = e.sanket_no
        ${ filters }
        ORDER BY u.id
    `;

    try {
        const result = await pool.query( sql, params );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );


// Update User Route
router.put( '/update_user/:userid', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const active_user = req.user.id;
    let current_office;

    const { userid } = req.params;
    // console.log(req.body);
    const { name_np, username, userrole, password, repassword, office, branch, is_active } = req.body;
    if ( office == '' || office == null || office == undefined ) {
        current_office = active_office;
    } else {
        current_office = office;
    }

    if ( !username || !name_np || !password || !repassword || !office ) {
        return res.status( 400 ).json( { message: "सबै फिल्डहरू आवश्यक छन्।" } );
    }

    if ( password !== repassword ) {
        return res.status( 400 ).json( { message: "पासवर्डहरू मिलेन।" } );
    }

    const existingUser = await query( "SELECT id FROM users WHERE user_login_id = ?", [userid] );
    if ( existingUser.length === 0 ) {
        return res.status( 400 ).json( { message: "यो प्रयोगकर्ता अवस्थित छैन।" } );
    }

    // const hashedPassword = await hashPasswordUsingBcrypt( password );
    const hashedPassword = await hashPasswordUsingArgon( password );

    const sql = `
        UPDATE users SET user_name=?, user_login_id=?, role_id=?, password=?, office_id=?, branch_id=?, is_active=? WHERE user_login_id=?`;

    try {
        const result = await query( sql, [name_np, username, userrole, hashedPassword, current_office, branch, is_active, userid] );
        return res.json( { Status: true, Result: result } );
    } catch ( err ) {
        console.error( "Database Query Error:", err );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );

router.put( '/reset_password', verifyToken, async ( req, res ) => {
    const active_user = req.user.id;
    const { old_password, password, repassword } = req.body;

    const fetchUserQuery = `
    SELECT DISTINCT u.*,
      o.office_name_with_letter_address AS office_np, o.letter_address AS office_en,
      o.id AS office_id, ut.usertype_en, ut.usertype_np, ur.id AS role_id, ur.role_name, b.branch_np
    FROM users u
    LEFT JOIN offices o ON u.office_id = o.id
    LEFT JOIN branch b ON u.branch_id = b.id
    LEFT JOIN usertypes ut ON u.usertype = ut.id
    LEFT JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = ?`;

    try {
        // Fetch user data
        const [userdb] = await pool.query( fetchUserQuery, [active_user] );
        if ( userdb.length === 0 ) {
            return res.status( 401 ).json( { loginStatus: false, message: "Invalid user" } );
        }

        const user = userdb[0];

        // Verify old password matches
        // const isMatch = await bcrypt.compare( old_password, user.password );
        const isMatch = await argon2.verify( hash, user.password );
        if ( !isMatch ) {
            return res.status( 401 ).json( { loginStatus: false, message: "पुरानो पासवर्ड मिलेन" } ); // Old password does not match
        }

        if ( old_password === password ) {
            return res.status( 400 ).json( { message: "पुरानो र नयाँ पासवर्ड उस्तै छन्। कृपया नयाँ पासवर्ड दिनुहोस्।" } );
        }

        // Check new password confirmation
        if ( password !== repassword ) {
            return res.status( 400 ).json( { message: "पासवर्डहरू मिलेन।" } ); // Passwords do not match
        }

        // Hash new password and update
        // const hashedPassword = await hashPassword( password );
        const hashedPassword = await hashPasswordUsingArgon( password );
        const [result] = await pool.query(
            `UPDATE users SET password = ?, must_change_password = ? WHERE id = ?`,
            [hashedPassword, 0, active_user]
        );

        return res.json( { Status: true, Result: result } );
    } catch ( error ) {
        console.error( "Database Query Error:", error );
        res.status( 500 ).json( { Status: false, Error: "Internal Server Error" } );
    }
} );


// Delete User Route
router.delete( '/delete_user/:id', async ( req, res ) => {
    const { id } = req.params;

    if ( !Number.isInteger( parseInt( id ) ) ) {
        return res.status( 400 ).json( { Status: false, Error: 'Invalid ID format' } );
    }

    try {
        const sql = "DELETE FROM users WHERE id = ?";
        con.query( sql, id, ( err, result ) => {
            if ( err ) {
                console.error( 'Database query error:', err );
                return res.status( 500 ).json( { Status: false, Error: 'Internal server error' } );
            }

            if ( result.affectedRows === 0 ) {
                return res.status( 404 ).json( { Status: false, Error: 'Record not found' } );
            }

            return res.status( 200 ).json( { Status: true, Result: result } );
        } );
    } catch ( error ) {
        console.error( 'Unexpected error:', error );
        return res.status( 500 ).json( { Status: false, Error: 'Unexpected error occurred' } );
    }
} );

router.post( '/login', async ( req, res ) => {
    const { username, password } = req.body;
    const validation = validateLoginInput( username, password );

    if ( !validation.isValid ) {
        return res.status( 400 ).json( { loginStatus: false, Error: validation.message } );
    }

    const fetchUserQuery = `
    SELECT DISTINCT u.*, vo.name AS office_np
    FROM visitors_customuser u
    LEFT JOIN visitors_office vo ON u.office_code=vo.id
    WHERE u.username = ?`;
    try {
        // Use promise-based query
        const [result] = await pool.query( fetchUserQuery, [username] );
        if ( result.length === 0 ) {
            return res.status( 401 ).json( { loginStatus: false, Error: "Invalid username or password" } );
        }
        const user = result[0];
        console.log( user );

        // const isMatch = await bcrypt.compare( password, user.password );
        // const isMatch = await argon2.verify( user.password, password );

        let isMatch = false;
        if ( user.password.startsWith( "pbkdf2_sha256$" ) ) {
            // Old Django password
            if ( verifyPBKDF2( password, user.password ) ) {
                isMatch = true;

                // 🔄 Upgrade to Argon2
                const newHash = await argon2.hash( password, {
                    type: argon2.argon2id,
                    memoryCost: 2 ** 16,
                    timeCost: 3,
                    parallelism: 1
                } );
                await pool.query(
                    "UPDATE visitors_customuser SET password = ? WHERE id = ?",
                    [newHash, user.id]
                );
                console.log( `Password for user ${ username } upgraded to Argon2` );
            }
        } else {
            // Assume Argon2
            if ( await argon2.verify( user.password, password ) ) {
                isMatch = true;
            }
        }
        if ( !isMatch ) {
            return res.status( 401 ).json( { loginStatus: false, Error: "Invalid username or password" } );
        }

        const userdetails = {
            id: user.id,
            name_en: user.user_name,
            username: user.user_login_id,
            email: user.email,
            user_permission: user.user_permission,
            is_staff: user.is_staff,
            is_active: user.is_active,
            is_online: 1,
            is_superuser: user.issuperuser,
            last_login: user.last_login,
            join_date: user.join_date,
            office_id: user.office_id,
            office_np: user.office_np,
            office_en: user.office_en,
            branch_name: user.branch_name,
            usertype_en: user.usertype_en,
            usertype_np: user.usertype_np,
            role_id: user.role_id,
            role_name: user.role_name
        };

        const token = jwt.sign( userdetails, process.env.JWT_SECRET, { expiresIn: '1h' } );

        res.cookie( 'token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            maxAge: 60 * 60 * 1000,
        } );

        req.session.user = { userdetails };

        // Update online status        
        // await pool.query( "UPDATE users SET is_online = 1, last_seen = NOW() WHERE id = ?", [user.id] );

        return res.json( {
            loginStatus: true,
            userdetails,
            must_change_password: user.must_change_password
        } );

    } catch ( err ) {
        console.error( "Unexpected error:", err );
        return res.status( 500 ).json( { loginStatus: false, Error: "Server error" } );
    }
} );






// Logout Route
// Include this middleware if you're using JWT to extract req.user
router.post( '/logout', verifyToken, async ( req, res ) => {
    if ( !req.user || !req.user.id ) {
        return res.status( 401 ).json( { success: false, message: 'Unauthorized' } );
    }

    const user_id = req.user.id;

    try {
        // await pool.query( "UPDATE users SET is_online = 0 WHERE id = ?", [user_id] );

        res.clearCookie( 'token', {
            httpOnly: true,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production',
        } );

        return res.status( 200 ).json( { success: true, message: 'Logout successful' } );
    } catch ( error ) {
        console.error( 'Logout error:', error );
        return res.status( 500 ).json( { success: false, message: 'Logout failed' } );
    }
} );

router.get( '/get_online_status', verifyToken, async ( req, res ) => {
    try {
        const sql = `
      SELECT o.id AS office_id, o.letter_address AS office_name, MAX(u.is_online) AS is_online
      FROM offices o
      LEFT JOIN users u ON o.id = u.office_id
      WHERE o.office_categories_id= 2 OR office_categories_id=3
      GROUP BY o.id
    `;
        const [result] = await pool.query( sql );

        res.json( { success: true, data: result } );
    } catch ( err ) {
        console.error( 'Online status fetch error:', err );
        res.status( 500 ).json( { success: false, message: 'Failed to fetch online status' } );
    }
} );

router.post( '/login_ping', verifyToken, async ( req, res ) => {
    const active_office = req.user.office_id;
    const user_id = req.user.id;

    // Corrected logic
    // if (active_office !== 1 && active_office !== 2) return;
    try {
        await pool.query(
            "UPDATE visitors_customuser SET is_online = 1, last_seen = NOW() WHERE id = ?",
            [user_id]
        );
        res.json( { success: true } );
    } catch ( error ) {
        console.error( "Ping error:", error );
        res.status( 500 ).json( { success: false } );
    }
} );

// Session Validation Route
router.get( '/session', verifyToken, ( req, res ) => {
    // console.log('session', req.user)
    if ( !req.user ) return res.status( 401 ).json( { loggedIn: false } );
    // console.log( 'session', req.user );
    const { name_en, username, email, is_staff, is_active, is_online, last_login, join_date,
        office_id, office_np, office_en, usertype_en, usertype_np, role_id, role_name } = req.user;

    return res.json( {
        loggedIn: true,
        user: {
            name_en,
            username,
            email,
            is_staff,
            is_active,
            is_online,
            last_login,
            join_date,
            office_id, office_np, office_en,
            usertype_en, usertype_np, role_id, role_name
        }
    } );
} );

// Health Check Route
router.get( '/health', ( req, res ) => {
    res.status( 200 ).send( "OK" );
} );

export { router as authRouter };
