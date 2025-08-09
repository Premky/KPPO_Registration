// server/middlewares/cloudinaryUpload.js

import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { nanoid } from 'nanoid';

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up storage engine for multer (we're using memoryStorage to handle files before uploading to Cloudinary)
const storage = multer.memoryStorage();

// Initialize multer with the storage engine
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
    fileFilter: (req, file, cb) => {
        // Allow only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Cloudinary upload function
const cloudinaryUpload = async (req, res, next) => {
    try {
        if (req.file) {
            // Generate a unique file name using nanoid to avoid conflicts
            const filename = nanoid() + '-' + req.file.originalname;

            // Upload file to Cloudinary
            const result = await cloudinary.uploader.upload_stream({
                public_id: filename,
                resource_type: 'image',
                folder: 'KPTPO', // Specify Cloudinary folder (optional)
            }, (error, result) => {
                if (error) {
                    return res.status(500).json({ message: 'Cloudinary upload failed', error });
                }
                req.file = result; // Attach Cloudinary result to the request object
                next(); // Proceed to the next middleware (route handler)
            });

            // Pipe the file buffer to Cloudinary
            result.end(req.file.buffer);
        } else {
            next(); // No file, so just proceed
        }
    } catch (err) {
        console.error('Error in cloudinaryUpload middleware:', err);
        res.status(500).json({ message: 'File upload error', error: err });
    }
};

export { upload, cloudinaryUpload };
