import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.js';

// Session handling helpers using a signed JWT cookie named "session".

/**
 * Read the JWT from the request cookies and decode the session.
 * @param {import('express').Request} req Express request with cookies
 * @returns {object} Decoded session object or empty object if invalid
 */
export function getSession(req) {
    const token = req.cookies?.session;
    if (!token) return {};
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return {};
    }
}

/**
 * Sign the session data and set it as a httpOnly cookie.
 * @param {import('express').Response} res Express response
 * @param {object} data Arbitrary session data
 */
export function setSession(res, data) {
    const token = jwt.sign(data, JWT_SECRET);
    res.cookie('session', token, { httpOnly: true });
}

/**
 * Express middleware that attaches `req.session` based on the cookie.
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export function jwtSessionMiddleware(req, _res, next) {
    req.session = getSession(req);
    next();
}
