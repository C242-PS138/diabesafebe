const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.patch('/:userId', userController.updateUser);

module.exports = router;
