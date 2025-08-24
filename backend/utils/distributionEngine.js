/**
 * Advanced distribution algorithms for task assignment
 */
class DistributionEngine {
  constructor() {
    this.strategies = {
      equal: this.equalDistribution.bind(this),
      weighted: this.weightedDistribution.bind(this),
      priority: this.priorityDistribution.bind(this)
    };
  }

  /**
   * Main distribution method
   */
  async distribute(records, agents, strategy = 'equal', options = {}) {
    const startTime = Date.now();
    
    if (!records || records.length === 0) {
      throw new Error('No records to distribute');
    }

    if (!agents || agents.length === 0) {
      throw new Error('No agents available for distribution');
    }

    // Filter active agents only
    const activeAgents = agents.filter(agent => agent.isActive);
    
    if (activeAgents.length === 0) {
      throw new Error('No active agents available');
    }

    // Apply distribution strategy
    const distributionMethod = this.strategies[strategy] || this.strategies.equal;
    const distributedData = await distributionMethod(records, activeAgents, options);

    const distributionTime = Date.now() - startTime;

    return {
      agents: distributedData,
      summary: this.generateSummary(distributedData, records.length, distributionTime),
      strategy,
      distributionTime
    };
  }

  /**
   * Equal distribution - distributes records evenly among agents
   */
  async equalDistribution(records, agents, options = {}) {
    const agentsCount = agents.length;
    const recordsPerAgent = Math.floor(records.length / agentsCount);
    const remainingRecords = records.length % agentsCount;

    const distributedAgents = [];
    let recordIndex = 0;

    for (let i = 0; i < agentsCount; i++) {
      const agent = agents[i];
      const assignCount = recordsPerAgent + (i < remainingRecords ? 1 : 0);
      const agentRecords = records.slice(recordIndex, recordIndex + assignCount);

      distributedAgents.push({
        agentId: agent._id,
        agentName: agent.name,
        agentEmail: agent.email,
        assignedCount: assignCount,
        records: agentRecords.map(record => ({
          ...record,
          status: 'pending',
          assignedAt: new Date()
        }))
      });

      recordIndex += assignCount;
    }

    return distributedAgents;
  }

  /**
   * Weighted distribution - considers agent performance and current workload
   */
  async weightedDistribution(records, agents, options = {}) {
    // Calculate weights based on completion rate and current workload
    const agentWeights = this.calculateAgentWeights(agents);
    const totalWeight = agentWeights.reduce((sum, weight) => sum + weight.weight, 0);

    const distributedAgents = [];
    let recordIndex = 0;

    for (const agentWeight of agentWeights) {
      const agent = agents.find(a => a._id.toString() === agentWeight.agentId);
      const proportion = agentWeight.weight / totalWeight;
      const assignCount = Math.round(records.length * proportion);
      const agentRecords = records.slice(recordIndex, recordIndex + assignCount);

      distributedAgents.push({
        agentId: agent._id,
        agentName: agent.name,
        agentEmail: agent.email,
        assignedCount: assignCount,
        weight: agentWeight.weight,
        records: agentRecords.map(record => ({
          ...record,
          status: 'pending',
          assignedAt: new Date()
        }))
      });

      recordIndex += assignCount;
    }

    // Distribute any remaining records to top performers
    if (recordIndex < records.length) {
      const remainingRecords = records.slice(recordIndex);
      const topPerformer = distributedAgents[0]; // First agent has highest weight
      topPerformer.records.push(...remainingRecords.map(record => ({
        ...record,
        status: 'pending',
        assignedAt: new Date()
      })));
      topPerformer.assignedCount += remainingRecords.length;
    }

    return distributedAgents;
  }

  /**
   * Priority distribution - considers record complexity and agent expertise
   */
  async priorityDistribution(records, agents, options = {}) {
    // Sort records by complexity (based on notes length as a simple metric)
    const sortedRecords = records.sort((a, b) => {
      const complexityA = (a.notes || '').length;
      const complexityB = (b.notes || '').length;
      return complexityB - complexityA; // High complexity first
    });

    // Sort agents by performance
    const sortedAgents = agents.sort((a, b) => {
      const performanceA = this.calculateAgentPerformance(a);
      const performanceB = this.calculateAgentPerformance(b);
      return performanceB - performanceA; // Best performers first
    });

    const distributedAgents = sortedAgents.map(agent => ({
      agentId: agent._id,
      agentName: agent.name,
      agentEmail: agent.email,
      assignedCount: 0,
      records: []
    }));

    // Assign records in round-robin fashion, starting with best agents for complex tasks
    let agentIndex = 0;
    for (const record of sortedRecords) {
      const agent = distributedAgents[agentIndex];
      agent.records.push({
        ...record,
        status: 'pending',
        assignedAt: new Date()
      });
      agent.assignedCount++;

      agentIndex = (agentIndex + 1) % distributedAgents.length;
    }

    return distributedAgents;
  }

  /**
   * Calculate agent weights for weighted distribution
   */
  calculateAgentWeights(agents) {
    return agents.map(agent => {
      const performance = this.calculateAgentPerformance(agent);
      const workloadFactor = this.calculateWorkloadFactor(agent);
      
      // Combine performance and workload to determine weight
      // Higher performance = higher weight, higher workload = lower weight
      const weight = Math.max(0.1, performance * workloadFactor);

      return {
        agentId: agent._id.toString(),
        weight,
        performance,
        workloadFactor
      };
    }).sort((a, b) => b.weight - a.weight); // Sort by weight descending
  }

  /**
   * Calculate agent performance score (0-1)
   */
  calculateAgentPerformance(agent) {
    if (agent.assignedTasks === 0) return 0.7; // Default for new agents
    
    const completionRate = agent.completedTasks / agent.assignedTasks;
    const experienceFactor = Math.min(1, agent.assignedTasks / 100); // Max at 100 tasks
    
    return (completionRate * 0.7) + (experienceFactor * 0.3);
  }

  /**
   * Calculate workload factor (0-1, higher is better)
   */
  calculateWorkloadFactor(agent) {
    // This would ideally check current pending tasks from database
    // For now, use a simple calculation based on assigned vs completed ratio
    const pendingTasks = agent.assignedTasks - agent.completedTasks;
    
    if (pendingTasks <= 0) return 1; // No pending tasks = full availability
    if (pendingTasks >= 50) return 0.1; // Too many pending = low availability
    
    return Math.max(0.1, 1 - (pendingTasks / 50));
  }

  /**
   * Generate distribution summary
   */
  generateSummary(distributedAgents, totalRecords, distributionTime) {
    const agentCounts = distributedAgents.map(agent => agent.assignedCount);
    const minAssigned = Math.min(...agentCounts);
    const maxAssigned = Math.max(...agentCounts);
    const avgAssigned = totalRecords / distributedAgents.length;

    return {
      totalAgentsAssigned: distributedAgents.length,
      totalRecordsDistributed: totalRecords,
      averageRecordsPerAgent: Math.round(avgAssigned * 100) / 100,
      minRecordsAssigned: minAssigned,
      maxRecordsAssigned: maxAssigned,
      distributionVariance: maxAssigned - minAssigned,
      distributionTime: distributionTime,
      fairnessScore: this.calculateFairnessScore(agentCounts)
    };
  }

  /**
   * Calculate fairness score (0-1, higher is more fair)
   */
  calculateFairnessScore(agentCounts) {
    if (agentCounts.length <= 1) return 1;

    const avg = agentCounts.reduce((sum, count) => sum + count, 0) / agentCounts.length;
    const variance = agentCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / agentCounts.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher fairness
    // Normalize to 0-1 scale
    return Math.max(0, 1 - (standardDeviation / avg));
  }

  /**
   * Re-distribute failed or returned tasks
   */
  async redistributeTasks(failedTasks, availableAgents, originalDistribution) {
    if (!failedTasks || failedTasks.length === 0) {
      return originalDistribution;
    }

    // Find agents with lowest current workload
    const agentWorkloads = originalDistribution.agents.map(agent => ({
      ...agent,
      currentLoad: agent.records.filter(r => r.status === 'pending' || r.status === 'in-progress').length
    })).sort((a, b) => a.currentLoad - b.currentLoad);

    // Redistribute failed tasks to agents with lowest workload
    let agentIndex = 0;
    for (const task of failedTasks) {
      const targetAgent = agentWorkloads[agentIndex];
      targetAgent.records.push({
        ...task,
        status: 'pending',
        assignedAt: new Date(),
        redistributed: true
      });
      targetAgent.assignedCount++;
      targetAgent.currentLoad++;

      agentIndex = (agentIndex + 1) % agentWorkloads.length;
    }

    return {
      ...originalDistribution,
      agents: agentWorkloads.map(({ currentLoad, ...agent }) => agent)
    };
  }

  /**
   * Get distribution analytics
   */
  getDistributionAnalytics(distribution) {
    const analytics = {
      totalTasks: distribution.summary.totalRecordsDistributed,
      agentPerformance: distribution.agents.map(agent => {
        const completed = agent.records.filter(r => r.status === 'completed').length;
        const inProgress = agent.records.filter(r => r.status === 'in-progress').length;
        const pending = agent.records.filter(r => r.status === 'pending').length;
        
        return {
          agentName: agent.agentName,
          assigned: agent.assignedCount,
          completed,
          inProgress,
          pending,
          completionRate: agent.assignedCount > 0 ? (completed / agent.assignedCount) * 100 : 0
        };
      }),
      overallProgress: {
        completed: distribution.agents.reduce((sum, agent) => 
          sum + agent.records.filter(r => r.status === 'completed').length, 0),
        inProgress: distribution.agents.reduce((sum, agent) => 
          sum + agent.records.filter(r => r.status === 'in-progress').length, 0),
        pending: distribution.agents.reduce((sum, agent) => 
          sum + agent.records.filter(r => r.status === 'pending').length, 0)
      }
    };

    analytics.overallCompletionRate = analytics.totalTasks > 0 ? 
      (analytics.overallProgress.completed / analytics.totalTasks) * 100 : 0;

    return analytics;
  }
}

module.exports = DistributionEngine;
