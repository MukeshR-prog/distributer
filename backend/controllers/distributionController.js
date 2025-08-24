const Distribution = require('../models/Distribution');
const User = require('../models/User');
const FileProcessor = require('../utils/fileProcessor');
const DistributionEngine = require('../utils/distributionEngine');
const { asyncHandler } = require('../middleware/errorHandler');
const { cleanupFile } = require('../utils/upload');

/**
 * @desc    Upload and distribute CSV/Excel file
 * @route   POST /api/distributions/upload
 * @access  Private (Admin)
 */
const uploadAndDistribute = asyncHandler(async (req, res) => {
  const { strategy = 'equal' } = req.body;
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const startTime = Date.now();

  try {
    // Process the uploaded file
    const fileProcessor = new FileProcessor();
    const processedData = await fileProcessor.processFile(req.file);

    // Get active agents
    const agents = await User.find({ role: 'agent', isActive: true });
    
    if (agents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active agents available for distribution'
      });
    }

    // Distribute records among agents
    const distributionEngine = new DistributionEngine();
    const distributionResult = await distributionEngine.distribute(
      processedData.data,
      agents,
      strategy
    );

    // Create distribution record
    const distribution = await Distribution.create({
      fileName: processedData.fileName,
      originalFileName: req.file.originalname,
      fileSize: processedData.fileSize,
      totalRecords: processedData.data.length,
      uploadedBy: req.user._id,
      distributionStrategy: strategy,
      status: 'completed',
      agents: distributionResult.agents,
      summary: distributionResult.summary,
      metadata: {
        columns: [
          { name: 'firstName', type: 'string', required: true },
          { name: 'phone', type: 'string', required: true },
          { name: 'notes', type: 'string', required: false }
        ],
        validationErrors: processedData.errors || [],
        skippedRows: processedData.skippedRows || 0
      }
    });

    // Update agent task counts
    for (const agent of distributionResult.agents) {
      await User.findByIdAndUpdate(
        agent.agentId,
        { $inc: { assignedTasks: agent.assignedCount } }
      );
    }

    const processingTime = Date.now() - startTime;

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('distributionCreated', {
        distribution: distribution._id,
        totalRecords: distribution.totalRecords,
        agentsCount: distribution.agents.length,
        strategy: distribution.distributionStrategy
      });
    }

    console.log(`📊 Distribution created: ${distribution._id} (${processedData.data.length} records, ${agents.length} agents, ${processingTime}ms)`);

    res.status(201).json({
      success: true,
      message: 'File uploaded and distributed successfully',
      data: {
        distribution: {
          id: distribution._id,
          fileName: distribution.fileName,
          totalRecords: distribution.totalRecords,
          strategy: distribution.distributionStrategy,
          agentsAssigned: distribution.agents.length,
          processingTime,
          createdAt: distribution.createdAt
        },
        fileStats: fileProcessor.getFileStats(processedData),
        summary: distributionResult.summary
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      cleanupFile(req.file.path);
    }
    
    console.error('Distribution error:', error);
    throw error;
  }
});

/**
 * @desc    Get all distributions
 * @route   GET /api/distributions
 * @access  Private
 */
const getDistributions = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    status, 
    strategy,
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    dateFrom,
    dateTo
  } = req.query;

  // Build query
  const query = {};

  // For agents, only show distributions they're part of
  if (req.user.role === 'agent') {
    query['agents.agentId'] = req.user._id;
  }

  // Add search filter
  if (search) {
    query.$or = [
      { fileName: { $regex: search, $options: 'i' } },
      { originalFileName: { $regex: search, $options: 'i' } }
    ];
  }

  // Add status filter
  if (status) {
    query.status = status;
  }

  // Add strategy filter
  if (strategy) {
    query.distributionStrategy = strategy;
  }

  // Add date range filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const distributions = await Distribution.find(query)
    .populate('uploadedBy', 'name email')
    .populate('agents.agentId', 'name email')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  // Get total count
  const total = await Distribution.countDocuments(query);

  res.json({
    success: true,
    data: {
      distributions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDistributions: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  });
});

/**
 * @desc    Get single distribution
 * @route   GET /api/distributions/:id
 * @access  Private
 */
const getDistribution = asyncHandler(async (req, res) => {
  const distribution = await Distribution.findById(req.params.id)
    .populate('uploadedBy', 'name email')
    .populate('agents.agentId', 'name email');

  if (!distribution) {
    return res.status(404).json({
      success: false,
      message: 'Distribution not found'
    });
  }

  // Check if agent can access this distribution
  if (req.user.role === 'agent') {
    const isAgentAssigned = distribution.agents.some(
      agent => agent.agentId._id.toString() === req.user._id.toString()
    );

    if (!isAgentAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
  }

  res.json({
    success: true,
    data: { distribution }
  });
});

/**
 * @desc    Get agent's assigned records from a distribution
 * @route   GET /api/distributions/:id/my-records
 * @access  Private (Agent)
 */
const getMyRecords = asyncHandler(async (req, res) => {
  // If no distribution ID, get all records for the agent
  if (!req.params.id) {
    return getAllMyRecords(req, res);
  }

  const distribution = await Distribution.findById(req.params.id);

  if (!distribution) {
    return res.status(404).json({
      success: false,
      message: 'Distribution not found'
    });
  }

  // Find agent's records
  const agentData = distribution.agents.find(
    agent => agent.agentId.toString() === req.user._id.toString()
  );

  if (!agentData) {
    return res.status(403).json({
      success: false,
      message: 'You are not assigned to this distribution'
    });
  }

  res.json({
    success: true,
    data: {
      distributionId: distribution._id,
      fileName: distribution.fileName,
      assignedCount: agentData.assignedCount,
      records: agentData.records,
      summary: {
        total: agentData.records.length,
        pending: agentData.records.filter(r => r.status === 'pending').length,
        inProgress: agentData.records.filter(r => r.status === 'in-progress').length,
        completed: agentData.records.filter(r => r.status === 'completed').length,
        failed: agentData.records.filter(r => r.status === 'failed').length
      }
    }
  });
});

/**
 * @desc    Get all agent's assigned records across all distributions
 * @route   GET /api/distributions/my-records
 * @access  Private (Agent)
 */
const getAllMyRecords = asyncHandler(async (req, res) => {
  // Find all distributions where this agent is assigned
  const distributions = await Distribution.find({
    'agents.agentId': req.user._id
  }).populate('uploadedBy', 'name email');

  // Collect all records assigned to this agent
  let allRecords = [];
  
  distributions.forEach(distribution => {
    const agentData = distribution.agents.find(
      agent => agent.agentId.toString() === req.user._id.toString()
    );
    
    if (agentData && agentData.records) {
      // Add distribution info to each record
      const recordsWithDistribution = agentData.records.map(record => ({
        ...record.toObject(),
        distributionId: distribution._id,
        distributionName: distribution.fileName,
        uploadedBy: distribution.uploadedBy
      }));
      
      allRecords = allRecords.concat(recordsWithDistribution);
    }
  });

  res.json({
    success: true,
    records: allRecords,
    summary: {
      total: allRecords.length,
      pending: allRecords.filter(r => r.status === 'pending').length,
      inProgress: allRecords.filter(r => r.status === 'in-progress').length,
      completed: allRecords.filter(r => r.status === 'completed').length,
      failed: allRecords.filter(r => r.status === 'failed').length,
      cancelled: allRecords.filter(r => r.status === 'cancelled').length
    }
  });
});

/**
 * @desc    Update record status
 * @route   PUT /api/distributions/:id/records/:recordIndex
 * @access  Private (Agent)
 */
const updateRecordStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const { id: distributionId, recordIndex } = req.params;

  const distribution = await Distribution.findById(distributionId);

  if (!distribution) {
    return res.status(404).json({
      success: false,
      message: 'Distribution not found'
    });
  }

  // Find agent's data
  const agentData = distribution.agents.find(
    agent => agent.agentId.toString() === req.user._id.toString()
  );

  if (!agentData) {
    return res.status(403).json({
      success: false,
      message: 'You are not assigned to this distribution'
    });
  }

  const recordIdx = parseInt(recordIndex);
  if (recordIdx < 0 || recordIdx >= agentData.records.length) {
    return res.status(400).json({
      success: false,
      message: 'Invalid record index'
    });
  }

  const record = agentData.records[recordIdx];
  const oldStatus = record.status;

  // Update record
  record.status = status;
  if (notes) record.notes = notes;
  if (status === 'completed') record.completedAt = new Date();

  await distribution.save();

  // Update agent's task counts
  if (oldStatus !== 'completed' && status === 'completed') {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { completedTasks: 1 }
    });
  } else if (oldStatus === 'completed' && status !== 'completed') {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { completedTasks: -1 }
    });
  }

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('recordUpdated', {
      distributionId,
      agentId: req.user._id,
      recordIndex: recordIdx,
      status,
      completionPercentage: distribution.completionPercentage
    });
  }

  res.json({
    success: true,
    message: 'Record status updated successfully',
    data: { record }
  });
});

/**
 * @desc    Get distribution statistics
 * @route   GET /api/distributions/stats
 * @access  Private (Admin)
 */
const getDistributionStats = asyncHandler(async (req, res) => {
  const stats = await Distribution.getDistributionStats();

  // Get additional insights
  const strategyStats = await Distribution.aggregate([
    {
      $group: {
        _id: '$distributionStrategy',
        count: { $sum: 1 },
        avgRecords: { $avg: '$totalRecords' },
        avgTime: { $avg: '$summary.distributionTime' }
      }
    }
  ]);

  const monthlyStats = await Distribution.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 },
        totalRecords: { $sum: '$totalRecords' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.json({
    success: true,
    data: {
      ...stats,
      strategyBreakdown: strategyStats,
      monthlyTrends: monthlyStats
    }
  });
});

/**
 * @desc    Export distribution data
 * @route   GET /api/distributions/:id/export
 * @access  Private
 */
const exportDistribution = asyncHandler(async (req, res) => {
  const { format = 'csv' } = req.query;
  
  const distribution = await Distribution.findById(req.params.id)
    .populate('uploadedBy', 'name email')
    .populate('agents.agentId', 'name email');

  if (!distribution) {
    return res.status(404).json({
      success: false,
      message: 'Distribution not found'
    });
  }

  // Check permissions
  if (req.user.role === 'agent') {
    const isAgentAssigned = distribution.agents.some(
      agent => agent.agentId._id.toString() === req.user._id.toString()
    );

    if (!isAgentAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
  }

  // Prepare export data
  const exportData = [];
  
  distribution.agents.forEach(agent => {
    agent.records.forEach(record => {
      exportData.push({
        agentName: agent.agentName,
        agentEmail: agent.agentEmail,
        firstName: record.firstName,
        phone: record.phone,
        notes: record.notes,
        status: record.status,
        assignedAt: record.assignedAt,
        completedAt: record.completedAt || ''
      });
    });
  });

  if (format === 'csv') {
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Distribution');
    
    const csvData = XLSX.utils.sheet_to_csv(ws);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="distribution-${distribution._id}.csv"`);
    res.send(csvData);
  } else {
    res.json({
      success: true,
      data: exportData
    });
  }
});

/**
 * @desc    Delete distribution
 * @route   DELETE /api/distributions/:id
 * @access  Private (Admin)
 */
const deleteDistribution = asyncHandler(async (req, res) => {
  const distribution = await Distribution.findById(req.params.id);

  if (!distribution) {
    return res.status(404).json({
      success: false,
      message: 'Distribution not found'
    });
  }

  // Update agent task counts (subtract assigned tasks)
  for (const agent of distribution.agents) {
    const completedCount = agent.records.filter(r => r.status === 'completed').length;
    await User.findByIdAndUpdate(agent.agentId, {
      $inc: { 
        assignedTasks: -agent.assignedCount,
        completedTasks: -completedCount
      }
    });
  }

  await Distribution.findByIdAndDelete(req.params.id);

  console.log(`🗑️ Distribution deleted: ${req.params.id} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Distribution deleted successfully'
  });
});

module.exports = {
  uploadAndDistribute,
  getDistributions,
  getDistribution,
  getMyRecords,
  getAllMyRecords,
  updateRecordStatus,
  getDistributionStats,
  exportDistribution,
  deleteDistribution
};
