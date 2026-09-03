const REALM = 'Admin';

function requireAdminAuth(req, res, next) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('Admin auth is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env');
    return res.status(503).json({ ok: false, error: 'Admin access is not configured.' });
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);

    if (user === username && pass === password) {
      return next();
    }
  }

  res.set('WWW-Authenticate', `Basic realm="${REALM}"`);
  return res.status(401).json({ ok: false, error: 'Authentication required.' });
}

module.exports = requireAdminAuth;
