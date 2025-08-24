const express = require('express');
const { body, param, query } = require('express-validator');
const Distribution = require('../models/Distribution');
const {
  uploadAndDistribute,
  getDistributions,
  getDistribution,
  getMyRecords,
  updateRecordStatus,
  getDistributionStats,
  exportDistribution,
  deleteDistribution
} = require('../controllers/distributionControllerNew');
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

// Routes
router.route('/')
  .get(getDistributions);

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

router.route('/my-records')
  .get(restrictTo('agent'), apiLimiter, getMyRecords);

router.route('/:id')
  .get(idValidation, handleValidationErrors, getDistribution)
  .delete(restrictTo('admin'), idValidation, handleValidationErrors, deleteDistribution);

router.route('/:id/records/:recordIndex')
  .put(restrictTo('agent'), updateRecordStatus);

router.route('/:id/export')
  .get(exportDistribution);

// Add this route for simpler record status updates
// Add this route for record status updates
router.route('/records/:recordId/status')
  .patch(restrictTo('agent'), async (req, res) => {
    try {
      console.log('=== Record Status Update Debug ===');
      console.log('Record ID:', req.params.recordId);
      console.log('User ID:', req.user._id);
      console.log('New Status:', req.body.status);
      
      const { recordId } = req.params;
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ['pending', 'in-progress', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      
      console.log('Looking for distribution...');
      
      // Find distribution containing this record
      const distribution = await Distribution.findOne({
        'agents.records._id': recordId,
        'agents.agentId': req.user._id
      });
      
      console.log('Distribution found:', !!distribution);
      
      if (!distribution) {
        console.log('No distribution found for record ID:', recordId);
        return res.status(404).json({
          success: false,
          message: 'Record not found or not assigned to you'
        });
      }
      
      // Find and update the specific record
      let recordFound = false;
      distribution.agents.forEach(agent => {
        console.log('Checking agent:', agent.agentId.toString(), 'vs', req.user._id.toString());
        if (agent.agentId.toString() === req.user._id.toString()) {
          agent.records.forEach(record => {
            console.log('Checking record:', record._id.toString(), 'vs', recordId);
            if (record._id.toString() === recordId) {
              console.log('Found record! Updating status from', record.status, 'to', status);
              record.status = status;
              record.updatedAt = new Date();
              recordFound = true;
            }
          });
        }
      });
      
      if (!recordFound) {
        console.log('Record not found in agent records');
        return res.status(404).json({
          success: false,
          message: 'Record not found in your assignments'
        });
      }
      
      console.log('Saving distribution...');
      await distribution.save();
      console.log('Distribution saved successfully');
      
      res.json({
        success: true,
        message: 'Record status updated successfully'
      });
    } catch (error) {
      console.error('=== Error in record status update ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error updating record status: ' + error.message
      });
    }
  });
module.exports = router;