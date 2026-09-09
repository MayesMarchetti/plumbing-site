const { createClient } = require('@supabase/supabase-js');

let client = null;

function getClient() {
  if (client) return client;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }

  // Service-role key bypasses row-level security — this client only ever runs
  // server-side (never shipped to the browser), so that's expected.
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return client;
}

// Lazy proxy: the Supabase client is built on first use rather than on require,
// so the app (and serverless cold starts) don't crash when the database env
// vars are absent — only request paths that actually touch the DB will error.
module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      const value = getClient()[prop];
      return typeof value === 'function' ? value.bind(getClient()) : value;
    },
  }
);
