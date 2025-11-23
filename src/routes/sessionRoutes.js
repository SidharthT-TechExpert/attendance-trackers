const express = require('express');
const { getSession } = require('../controllers/sessionController');

const router = express.Router();

router.get('/:sessionId', getSession);

module.exports = router;

