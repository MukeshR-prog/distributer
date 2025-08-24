const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  getAuthStats
} = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Validation rules
const registerValidation = [
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
  body('countryCode')
    .optional()
    .matches(/^\+\d{1,3}$/)
    .withMessage('Please provide a valid country code (e.g., +1, +91)'),
  body('phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('role')
    .optional()
    .isIn(['admin', 'agent'])
    .withMessage('Role must be either admin or agent')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('mobile')
    .optional()
    .matches(/^\+\d{1,3}\d{10}$/)
    .withMessage('Please provide a valid mobile number with country code')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Public routes
router.post('/login', authLimiter, loginValidation, handleValidationErrors, login);
router.post('/register', authLimiter, registerValidation, handleValidationErrors, register);

// Setup route for first admin (only if no users exist)
router.post('/setup', registerValidation, handleValidationErrors, register);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/me', getMe);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.put('/profile', updateProfileValidation, handleValidationErrors, updateProfile);
router.put('/change-password', changePasswordValidation, handleValidationErrors, changePassword);

// Admin only routes
router.get('/stats', restrictTo('admin'), getAuthStats);

module.exports = router;
