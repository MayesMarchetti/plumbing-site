const ExcelJS = require('exceljs');
const supabase = require('../db/supabaseClient');

const TABLE = 'completed_jobs';
const SHEET_NAME = 'Completed Appointments';
const HEADERS = ['Date', 'Employee Name', 'Customer Name', 'Customer Phone Number', 'Service Type', 'Payment Amount', 'Description'];

async function appendCompletionRow({ employeeName, customerName, customerPhone, serviceType, paymentAmount, dateCompleted, description }) {
  const { error } = await supabase.from(TABLE).insert({
    date: dateCompleted || new Date().toISOString().slice(0, 10),
    employee_name: employeeName,
    customer_name: customerName,
    customer_phone: customerPhone,
    service_type: serviceType,
    payment_amount: paymentAmount,
    description: description || null,
  });

  if (error) {
    console.error('Failed to append to completion log:', error.message);
    return false;
  }
  return true;
}

function applyFilters(query, { employee, serviceType, minAmount, maxAmount } = {}) {
  if (employee) query = query.ilike('employee_name', `%${employee}%`);
  if (serviceType) query = query.ilike('service_type', `%${serviceType}%`);
  if (minAmount !== undefined && minAmount !== null && minAmount !== '') query = query.gte('payment_amount', Number(minAmount));
  if (maxAmount !== undefined && maxAmount !== null && maxAmount !== '') query = query.lt('payment_amount', Number(maxAmount));
  return query;
}

async function readCompletionRows(filters = {}) {
  let query = supabase.from(TABLE).select('*').order('date', { ascending: false });
  query = applyFilters(query, filters);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data.map((row) => ({
    date: row.date,
    employeeName: row.employee_name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    serviceType: row.service_type,
    paymentAmount: Number(row.payment_amount),
    description: row.description || '',
  }));
}

async function buildCompletionWorkbookBuffer(filters = {}) {
  const rows = await readCompletionRows(filters);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME);
  sheet.addRow(HEADERS);
  rows.forEach((row) => {
    sheet.addRow([row.date, row.employeeName, row.customerName, row.customerPhone, row.serviceType, row.paymentAmount, row.description]);
  });

  return workbook.xlsx.writeBuffer();
}

module.exports = { appendCompletionRow, readCompletionRows, buildCompletionWorkbookBuffer };
