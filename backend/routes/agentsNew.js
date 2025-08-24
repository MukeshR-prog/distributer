const express = require('express');
const { body } = require('express-validator');
const {
  getAgents,
  createAgent,
  getAgent,
  updateAgent,
  deleteAgent,
  getAgentStats,
  getAgentAssignments
} = require('../controllers/agentControllerNew');
const { protect, restrictTo } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');

const router = express.Router();

// Validation rules
const agentValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('countryCode')
    .matches(/^\+\d{1,3}$/)
    .withMessage('Please provide a valid country code (e.g., +1, +91)'),
  body('phone')
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const updateAgentValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('countryCode')
    .optional()
    .matches(/^\+\d{1,3}$/)
    .withMessage('Please provide a valid country code'),
  body('phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
];

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Routes
router.route('/')
  .get(getAgents)
  .post(agentValidation, handleValidationErrors, createAgent);

router.get('/stats', getAgentStats);
router.get('/assignments', getAgentAssignments);

router.route('/:id')
  .get(getAgent)
  .put(updateAgentValidation, handleValidationErrors, updateAgent)
  .delete(deleteAgent);

module.exports = router;
