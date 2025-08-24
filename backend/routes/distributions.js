const express = require('express');
const { body, param, query } = require('express-validator');
const {
  uploadAndDistribute,
  getDistributions,
  getDistribution,
  getMyRecords,
  getAllMyRecords,
  updateRecordStatus,
  getDistributionStats,
  exportDistribution,
  deleteDistribution
} = require('../controllers/distributionController');
const { protect, restrictTo } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { uploadLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { uploadMiddleware } = require('../utils/upload');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Validation rules
const uploadValidation = [
  body('strategy')
    .optional()
    .isIn(['equal', 'weighted', 'priority'])
    .withMessage('Strategy must be equal, weighted, or priority')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid distribution ID format')
];

const recordUpdateValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid distribution ID format'),
  param('recordIndex')
    .isInt({ min: 0 })
    .withMessage('Record index must be a non-negative integer'),
  body('status')
    .isIn(['pending', 'in-progress', 'completed', 'failed'])
    .withMessage('Status must be pending, in-progress, completed, or failed'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'fileName', 'totalRecords', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('status')
    .optional()
    .isIn(['processing', 'completed', 'failed'])
    .withMessage('Status must be processing, completed, or failed'),
  query('strategy')
    .optional()
    .isIn(['equal', 'weighted', 'priority'])
    .withMessage('Strategy must be equal, weighted, or priority'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO date'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo must be a valid ISO date')
];

const exportValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid distribution ID format'),
  query('format')
    .optional()
    .isIn(['csv', 'json'])
    .withMessage('Format must be csv or json')
];

// Routes
router.route('/')
  .get(queryValidation, handleValidationErrors, getDistributions);

router.route('/my-records')
  .get(restrictTo('agent'), apiLimiter, getAllMyRecords);

router.route('/upload')
  .post(
    restrictTo('admin'),
    uploadLimiter,
    uploadMiddleware,
    uploadValidation,
    handleValidationErrors,
    uploadAndDistribute
  );

router.route('/stats')
  .get(restrictTo('admin'), apiLimiter, getDistributionStats);

router.route('/:id')
  .get(idValidation, handleValidationErrors, getDistribution)
  .delete(restrictTo('admin'), idValidation, handleValidationErrors, deleteDistribution);

router.route('/:id/my-records')
  .get(restrictTo('agent'), idValidation, handleValidationErrors, getMyRecords);

router.route('/:id/records/:recordIndex')
  .put(restrictTo('agent'), recordUpdateValidation, handleValidationErrors, updateRecordStatus);

router.route('/:id/export')
  .get(exportValidation, handleValidationErrors, exportDistribution);

module.exports = router;
