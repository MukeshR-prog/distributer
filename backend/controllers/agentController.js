const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all agents
 * @route   GET /api/agents
 * @access  Private (Admin)
 */
const getAgents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  // Build query
  const query = { role: 'agent' };

  // Add search filter
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } }
    ];
  }

  // Add status filter
  if (status !== undefined) {
    query.isActive = status === 'active';
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const agents = await User.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-password');

  // Get total count
  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      agents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalAgents: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  });
});

/**
 * @desc    Get single agent
 * @route   GET /api/agents/:id
 * @access  Private (Admin or Agent themselves)
 */
const getAgent = asyncHandler(async (req, res) => {
  const agent = await User.findById(req.params.id).select('-password');

  if (!agent || agent.role !== 'agent') {
    return res.status(404).json({
      success: false,
      message: 'Agent not found'
    });
  }

  // Check if user can access this agent's data
  if (req.user.role !== 'admin' && req.user._id.toString() !== agent._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: { agent }
  });
});

/**
 * @desc    Create new agent
 * @route   POST /api/agents
 * @access  Private (Admin)
 */
const createAgent = asyncHandler(async (req, res) => {
  const { name, email, password, mobile } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Create agent
  const agent = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    mobile: mobile.trim(),
    role: 'agent'
  });

  // Remove password from response
  agent.password = undefined;

  console.log(`✅ New agent created: ${agent.email} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Agent created successfully',
    data: { agent }
  });
});

/**
 * @desc    Update agent
 * @route   PUT /api/agents/:id
 * @access  Private (Admin or Agent themselves)
 */
const updateAgent = asyncHandler(async (req, res) => {
  const { name, mobile, isActive } = req.body;

  const agent = await User.findById(req.params.id);

  if (!agent || agent.role !== 'agent') {
    return res.status(404).json({
      success: false,
      message: 'Agent not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'admin' && req.user._id.toString() !== agent._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Only admin can change isActive status
  if (isActive !== undefined && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only admin can change agent status'
    });
  }

  // Update fields
  const updateData = {};
  if (name) updateData.name = name.trim();
  if (mobile) updateData.mobile = mobile.trim();
  if (isActive !== undefined && req.user.role === 'admin') {
    updateData.isActive = isActive;
  }

  const updatedAgent = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  console.log(`📝 Agent updated: ${updatedAgent.email} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Agent updated successfully',
    data: { agent: updatedAgent }
  });
});

/**
 * @desc    Delete agent
 * @route   DELETE /api/agents/:id
 * @access  Private (Admin)
 */
const deleteAgent = asyncHandler(async (req, res) => {
  const agent = await User.findById(req.params.id);

  if (!agent || agent.role !== 'agent') {
    return res.status(404).json({
      success: false,
      message: 'Agent not found'
    });
  }

  // Soft delete by deactivating
  agent.isActive = false;
  await agent.save();

  console.log(`🗑️ Agent deactivated: ${agent.email} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Agent deactivated successfully'
  });
});

/**
 * @desc    Get agent statistics
 * @route   GET /api/agents/stats
 * @access  Private (Admin)
 */
const getAgentStats = asyncHandler(async (req, res) => {
  const stats = await User.getAgentStats();

  // Get additional statistics
  const topPerformers = await User.find({ role: 'agent', assignedTasks: { $gt: 0 } })
    .sort({ completionRate: -1 })
    .limit(5)
    .select('name email assignedTasks completedTasks completionRate');

  const recentAgents = await User.find({ role: 'agent' })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email createdAt isActive');

  res.json({
    success: true,
    data: {
      ...stats,
      topPerformers,
      recentAgents
    }
  });
});

/**
 * @desc    Get agent performance analytics
 * @route   GET /api/agents/:id/performance
 * @access  Private (Admin or Agent themselves)
 */
const getAgentPerformance = asyncHandler(async (req, res) => {
  const agent = await User.findById(req.params.id);

  if (!agent || agent.role !== 'agent') {
    return res.status(404).json({
      success: false,
      message: 'Agent not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'admin' && req.user._id.toString() !== agent._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Get performance data from distributions
  const Distribution = require('../models/Distribution');
  
  const performanceData = await Distribution.aggregate([
    { $unwind: '$agents' },
    { $match: { 'agents.agentId': agent._id } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        totalAssigned: { $sum: '$agents.assignedCount' },
        distributions: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.json({
    success: true,
    data: {
      agent: {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        assignedTasks: agent.assignedTasks,
        completedTasks: agent.completedTasks,
        completionRate: agent.completionRate,
        joinedDate: agent.createdAt,
        lastActive: agent.lastLogin
      },
      monthlyPerformance: performanceData
    }
  });
});

/**
 * @desc    Bulk update agents
 * @route   PUT /api/agents/bulk
 * @access  Private (Admin)
 */
const bulkUpdateAgents = asyncHandler(async (req, res) => {
  const { agentIds, updateData } = req.body;

  if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Agent IDs array is required'
    });
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Update data is required'
    });
  }

  // Only allow certain fields to be bulk updated
  const allowedFields = ['isActive'];
  const filteredUpdateData = {};
  
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredUpdateData[key] = updateData[key];
    }
  });

  if (Object.keys(filteredUpdateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: `Only these fields can be bulk updated: ${allowedFields.join(', ')}`
    });
  }

  const result = await User.updateMany(
    { _id: { $in: agentIds }, role: 'agent' },
    filteredUpdateData
  );

  console.log(`📊 Bulk update: ${result.modifiedCount} agents updated by ${req.user.email}`);

  res.json({
    success: true,
    message: `${result.modifiedCount} agents updated successfully`,
    data: {
      matched: result.matchedCount,
      modified: result.modifiedCount
    }
  });
});

module.exports = {
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentStats,
  getAgentPerformance,
  bulkUpdateAgents
};
