const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentStats,
  getAgentPerformance,
  bulkUpdateAgents
} = require('../controllers/agentController');
const { protect, restrictTo } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Validation rules
const createAgentValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('mobile')
    .matches(/^\+\d{1,3}\d{10}$/)
    .withMessage('Please provide a valid mobile number with country code')
];

const updateAgentValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('mobile')
    .optional()
    .matches(/^\+\d{1,3}\d{10}$/)
    .withMessage('Please provide a valid mobile number with country code'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid agent ID format')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['name', 'email', 'createdAt', 'lastLogin', 'assignedTasks', 'completedTasks', 'completionRate'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];

const bulkUpdateValidation = [
  body('agentIds')
    .isArray({ min: 1 })
    .withMessage('Agent IDs array is required'),
  body('agentIds.*')
    .isMongoId()
    .withMessage('Invalid agent ID format'),
  body('updateData')
    .isObject()
    .withMessage('Update data object is required'),
  body('updateData.isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Routes
router.route('/')
  .get(queryValidation, handleValidationErrors, getAgents)
  .post(restrictTo('admin'), createAgentValidation, handleValidationErrors, createAgent);

router.route('/stats')
  .get(restrictTo('admin'), getAgentStats);

router.route('/bulk')
  .put(restrictTo('admin'), bulkUpdateValidation, handleValidationErrors, bulkUpdateAgents);

router.route('/:id')
  .get(idValidation, handleValidationErrors, getAgent)
  .put(idValidation, updateAgentValidation, handleValidationErrors, updateAgent)
  .delete(restrictTo('admin'), idValidation, handleValidationErrors, deleteAgent);

router.route('/:id/performance')
  .get(idValidation, handleValidationErrors, getAgentPerformance);

// Apply rate limiting to data-intensive operations
router.use('/stats', apiLimiter);
router.use('/:id/performance', apiLimiter);

module.exports = router;
