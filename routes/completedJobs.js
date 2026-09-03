const express = require('express');
const requireAdminAuth = require('../middleware/basicAuth');
const { readCompletionRows, buildCompletionWorkbookBuffer } = require('../services/completionLog');

const router = express.Router();

router.use(requireAdminAuth);

function parseFilters(query) {
  const { employee, serviceType, minAmount, maxAmount } = query;
  return {
    employee: employee ? String(employee).trim() : '',
    serviceType: serviceType ? String(serviceType).trim() : '',
    minAmount: minAmount !== undefined && minAmount !== '' ? minAmount : undefined,
    maxAmount: maxAmount !== undefined && maxAmount !== '' ? maxAmount : undefined,
  };
}

router.get('/', async (req, res) => {
  try {
    const jobs = await readCompletionRows(parseFilters(req.query));
    res.json({ ok: true, jobs });
  } catch (err) {
    console.error('Failed to read completion log:', err.message);
    res.status(503).json({ ok: false, error: 'Completion log is temporarily unavailable. Try again shortly.' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const buffer = await buildCompletionWorkbookBuffer(parseFilters(req.query));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="completed-jobs.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Failed to export completion log:', err.message);
    res.status(503).json({ ok: false, error: 'Could not generate export. Try again shortly.' });
  }
});

module.exports = router;
