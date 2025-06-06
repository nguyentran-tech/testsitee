// netlify/functions/auth-proxy.js
const { Buffer } = require('buffer');
const path = require('path');
const fs = require('fs/promises'); // For reading static files

// --- Configuration ---
// Use environment variables for production passwords!
// Set these in Netlify UI: Site Settings > Build & deploy > Environment variables
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'myfriend';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'secretpass';
const REALM = "Friends Only"; // Text shown in the browser's auth popup

// --- Important: Path to your static files ---
// This assumes your static files are in a directory named 'public'
// relative to your project root. Adjust if yours is 'dist', 'build', etc.
const STATIC_FILES_DIR = path.join(process.cwd(), 'public');

exports.handler = async function(event, context) {
    const authHeader = event.headers.authorization;

    // 1. Check for Authentication Header
    if (!authHeader) {
        return {
            statusCode: 401,
            headers: {
                'WWW-Authenticate': `Basic realm="${REALM}"`
            },
            body: 'Authentication required.'
        };
    }

    // 2. Decode Credentials
    const encoded = authHeader.split(' ')[1];
    const decoded = Buffer.from(encoded, 'base64').toString();
    const [username, password] = decoded.split(':');

    // 3. Verify Credentials
    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
        // Authentication successful! Now serve the requested static file.
        let requestPath = event.path;
        // Remove the Netlify function prefix if it exists, though with the redirect it shouldn't
        if (requestPath.startsWith('/.netlify/functions/auth-proxy')) {
            requestPath = requestPath.replace('/.netlify/functions/auth-proxy', '');
        }
        if (requestPath === '/') {
            requestPath = '/index.html'; // Serve index.html for root requests
        }

        // Construct the full file path to your static asset
        const filePath = path.join(STATIC_FILES_DIR, requestPath);

        try {
            // Read the file content
            const fileContent = await fs.readFile(filePath);

            // Determine content type (simple, you might want a more robust solution)
            let contentType = 'text/plain';
            if (filePath.endsWith('.html')) contentType = 'text/html';
            else if (filePath.endsWith('.css')) contentType = 'text/css';
            else if (filePath.endsWith('.js')) contentType = 'application/javascript';
            else if (filePath.endsWith('.json')) contentType = 'application/json';
            else if (filePath.endsWith('.png')) contentType = 'image/png';
            else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
            else if (filePath.endsWith('.gif')) contentType = 'image/gif';
            // Add more content types as needed

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=3600' // Cache static assets for performance
                },
                body: fileContent.toString('base64'), // Netlify Functions require body to be a string
                isBase64Encoded: true // Tell Netlify to decode it
            };

        } catch (error) {
            console.error("Error serving static file:", error);
            // If file not found, return 404
            if (error.code === 'ENOENT') {
                return {
                    statusCode: 404,
                    body: 'Not Found'
                };
            }
            // Other errors
            return {
                statusCode: 500,
                body: 'Internal Server Error'
            };
        }

    } else {
        // 4. Authentication Failed
        return {
            statusCode: 401,
            headers: {
                'WWW-Authenticate': `Basic realm="${REALM}"`
            },
            body: 'Unauthorized.'
        };
    }
};