import { verifyToken } from '../services/authService.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    req.userId = verifyToken(header.slice(7)).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
