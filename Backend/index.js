import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectMySQL from 'express-mysql-session';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import errorHandler from './middlewares/errorHandler.js';
import './services/markOffline.js';

import { authRouter } from './routes/authRoute.js';
import {adminRouter} from './routes/adminRoute.js';
import { publicRouter } from './routes/publicRoutes.js';
import { employeRouter } from './routes/employeRoute.js';
import { visitorsRoute } from './routes/visitorsRoute.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3003;
const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

// ------------------- ✅ CORS FIRST -------------------
const hardOrigins = [
    'http://202.45.146.226',
    'http://localhost:3003',
    'http://localhost:3210',
    'http://202.45.146.226:5173',
    'https://202.45.146.226',
    'https://202.45.146.226:5173',
    'http://10.5.60.151',
    'http://10.5.60.151:5173',
    'http://10.5.60.151:5174',
    'https://10.5.60.151',
    'https://10.5.60.151:5173',
    'https://10.5.60.151:5174',
    'http://localhost:5173',
    'http://192.168.18.211:5173',
    'http://192.168.18.17:5173',
    'https://kptpo.onrender.com'
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split( ',' )
    : hardOrigins;

app.use( cors( {
    origin: ( origin, callback ) => {
        if ( !origin || allowedOrigins.includes( origin ) ) {
            callback( null, true );
        } else {
            callback( new Error( 'Not allowed by CORS' ) );
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
} ) );

app.use(
    '/uploads',
    ( req, res, next ) => {
        const origin = req.headers.origin;
        if ( origin && allowedOrigins.includes( origin ) ) {
            res.setHeader( 'Access-Control-Allow-Origin', origin );
        } else {
            // Allow direct browser access (no CORS header sent by <img> from same-origin)
            res.setHeader( 'Access-Control-Allow-Origin', '*' );
        }
        // res.setHeader( 'Cross-Origin-Resource-Policy', 'cross-origin' ); // ✅ Required for image sharing
        // res.setHeader( 'Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept' );

        next();
    },
    express.static( path.join( __dirname, 'uploads' ) ) // ← make sure this path is correct
);


// ✅ Preflight support for CORS
app.options( '*', cors() );

// ------------------- ✅ Middleware -------------------
app.use( helmet() );
app.use( express.json() );
app.use( cookieParser() );
app.use( bodyParser.urlencoded( { extended: true } ) );

// ------------------- ✅ Session AFTER CORS -------------------
app.use( session( {
    secret: process.env.JWT_SECRET || 'jwt_prem_ko_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // ✅ Secure only in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ safer fallback
        maxAge: 24 * 60 * 60 * 1000
    }
} ) );

// console.log(process.env.NODE_ENV === 'production')

// ------------------- ✅ Logging & Compression -------------------
if ( process.env.NODE_ENV !== 'production' ) {
    app.use( morgan( 'dev' ) );
} else {
    app.use( morgan( 'tiny' ) );
}
app.use( compression() );

// ------------------- ✅ Rate Limiting (Optional) -------------------
const limiter = rateLimit( {
    windowMs: 10 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
} );
// app.use(limiter);

// ------------------- ✅ Static Files -------------------
app.use( express.static( 'Public' ) );
// app.use('/Uploads', express.static(path.join(__dirname, 'Public', 'Uploads')));
// Best choice for your case
app.use( '/uploads', express.static( 'uploads' ) );

// ------------------- ✅ Routes -------------------
app.use( '/admin', adminRouter );
app.use( '/auth', authRouter );
app.use( '/public', publicRouter );
app.use( '/emp', employeRouter );
app.use( '/visitor', visitorsRoute );


// ------------------- ✅ Error Handler -------------------
app.use( errorHandler );

// ------------------- ✅ Server Start -------------------
app.listen( port, () => {
    console.log( `🚀 Server running on port ${ port }` );
} );

// ------------------- ✅ Graceful Shutdown -------------------
process.on( 'SIGINT', () => {
    console.log( '👋 Server shutting down...' );
    process.exit();
} );
