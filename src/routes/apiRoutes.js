const express = require('express');
const multer = require('multer');
const { listActiveStudentsJson } = require('../controllers/studentController');
const { createSession } = require('../controllers/sessionController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/students', listActiveStudentsJson);
router.post('/sessions', upload.single('meetingCsv'), createSession);

module.exports = router;

