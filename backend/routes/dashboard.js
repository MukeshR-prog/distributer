const express = require('express');
const { query } = require('express-validator');
const {
  getDashboardOverview,
  getAnalytics,
  getRecentActivity,
  getSystemHealth,
  getInsights
} = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Validation rules
const analyticsValidation = [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d'])
    .withMessage('Period must be 7d, 30d, or 90d')
];

const activityValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes
router.get('/overview', getDashboardOverview);

router.get('/analytics', 
  restrictTo('admin'), 
  analyticsValidation, 
  handleValidationErrors, 
  apiLimiter, 
  getAnalytics
);

router.get('/activity', 
  activityValidation, 
  handleValidationErrors, 
  getRecentActivity
);

router.get('/health', 
  restrictTo('admin'), 
  apiLimiter, 
  getSystemHealth
);

router.get('/insights', getInsights);

module.exports = router;
