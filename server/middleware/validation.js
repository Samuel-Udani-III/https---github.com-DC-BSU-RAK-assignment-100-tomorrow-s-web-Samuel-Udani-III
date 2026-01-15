const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateSignup = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateGame = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('genre')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Genre must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  handleValidationErrors
];

const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('text')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Review text must be less than 2000 characters'),
  handleValidationErrors
];

const validateReply = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Reply text must be between 1 and 2000 characters'),
  handleValidationErrors
];

const validateAccountUpdate = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('newPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors
];

module.exports = {
  validateSignup,
  validateLogin,
  validateGame,
  validateReview,
  validateReply,
  validateAccountUpdate,
  handleValidationErrors
};

