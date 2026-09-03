const supabase = require('../db/supabaseClient');

const VALID_STATUSES = ['pending', 'confirmed', 'completed'];
const UPDATABLE_FIELDS = [
  'customer_name',
  'customer_email',
  'customer_phone',
  'requested_time',
  'confirmed_time',
  'status',
  'assigned_employee',
  'service_type',
  'payment_amount',
  'google_calendar_event_id',
];

async function getById(id) {
  const { data, error } = await supabase.from('appointments').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function list({ status } = {}) {
  let query = supabase.from('appointments').select('*').order('requested_time', { ascending: true });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

async function create({ customer_name, customer_email, customer_phone, requested_time, service_type = null }) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ customer_name, customer_email, customer_phone, requested_time, service_type })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function update(id, fields) {
  const keys = Object.keys(fields).filter((key) => UPDATABLE_FIELDS.includes(key));
  if (keys.length === 0) return getById(id);

  if (fields.status && !VALID_STATUSES.includes(fields.status)) {
    throw new Error(`Invalid status: ${fields.status}`);
  }

  const patch = {};
  keys.forEach((key) => { patch[key] = fields[key]; });

  const { data, error } = await supabase.from('appointments').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function remove(id) {
  const { data, error } = await supabase.from('appointments').delete().eq('id', id).select();
  if (error) throw new Error(error.message);
  return data.length > 0;
}

module.exports = { VALID_STATUSES, getById, list, create, update, remove };
