const express = require('express');
const requireAdmin = require('../middlewares/requireAdmin');
const { getLogin, postLogin, logout } = require('../controllers/authController');
const {
  listStudents,
  createStudent,
  updateStudent,
} = require('../controllers/studentController');

const router = express.Router();

router.get('/login', getLogin);
router.post('/login', postLogin);
router.post('/logout', logout);

router.use(requireAdmin);

router.get('/students', listStudents);
router.post('/students', createStudent);
router.post('/students/:studentId', updateStudent);

module.exports = router;

