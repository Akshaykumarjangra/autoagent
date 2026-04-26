import jwt from 'jsonwebtoken';

const JWT_SECRET = () => process.env.JWT_SECRET || 'autonomix-fallback-secret-change-me';
const ADMIN_EMAIL = () => process.env.ADMIN_EMAIL || '';

/**
 * Generate a JWT for admin login
 */
export function generateAdminToken(email) {
  return jwt.sign({ email, role: 'admin' }, JWT_SECRET(), { expiresIn: '24h' });
}

/**
 * Verify admin email
 */
export function verifyAdminEmail(email) {
  const adminEmail = ADMIN_EMAIL();
  if (!adminEmail) return false;
  return email.toLowerCase().trim() === adminEmail.toLowerCase().trim();
}

/**
 * Express middleware: require valid admin JWT
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.adminUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
