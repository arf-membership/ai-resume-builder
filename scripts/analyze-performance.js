#!/usr/bin/env node

/**
 * Performance analysis script
 * Analyzes stored performance metrics and generates reports
 */

const fs = require('fs');
const path = require('path');

// Configuration
const STORAGE_KEY = 'cv_performance_metrics';
const OUTPUT_DIR = 'performance-reports';
const REPORT_FILE = 'performance-report.json';

/**
 * Load performance metrics from localStorage simulation
 */
function loadMetrics() {
  try {
    // In a real scenario, this would connect to your analytics service
    // For now, we'll simulate with a local file
    const metricsFile = path.join(process.cwd(), 'performance-metrics.json');
    
    if (fs.existsSync(metricsFile)) {
      const data = fs.readFileSync(metricsFile, 'utf8');
      return JSON.parse(data);
    }
    
    console.log('No performance metrics file found. Run the application to generate metrics.');
    return [];
  } catch (error) {
    console.error('Failed to load performance metrics:', error.message);
    return [];
  }
}

/**
 * Analyze performance metrics
 */
function analyzeMetrics(metrics) {
  const analysis = {
    summary: {
      totalMetrics: metrics.length,
      timeRange: {
        start: null,
        end: null,
      },
      metricTypes: {},
    },
    performance: {
      operations: {},
      slowOperations: [],
      averageDuration: 0,
    },
    errors: {
      total: 0,
      bySeverity: {},
      byComponent: {},
      errorRate: 0,
    },
    userInteractions: {
      total: 0,
      byAction: {},
      byPage: {},
    },
    resources: {
      memoryUsage: {
        average: 0,
        peak: 0,
        samples: 0,
      },
    },
    recommendations: [],
  };

  if (metrics.length === 0) {
    return analysis;
  }

  // Calculate time range
  const timestamps = metrics.map(m => m.timestamp).sort((a, b) => a - b);
  analysis.summary.timeRange.start = new Date(timestamps[0]).toISOString();
  analysis.summary.timeRange.end = new Date(timestamps[timestamps.length - 1]).toISOString();

  // Analyze by metric type
  metrics.forEach(metric => {
    const type = metric.type;
    analysis.summary.metricTypes[type] = (analysis.summary.metricTypes[type] || 0) + 1;

    switch (type) {
      case 'performance':
        analyzePerformanceMetric(metric, analysis);
        break;
      case 'error':
        analyzeErrorMetric(metric, analysis);
        break;
      case 'interaction':
        analyzeInteractionMetric(metric, analysis);
        break;
      case 'resource':
        analyzeResourceMetric(metric, analysis);
        break;
    }
  });

  // Calculate derived metrics
  calculateDerivedMetrics(analysis);
  
  // Generate recommendations
  generateRecommendations(analysis);

  return analysis;
}

/**
 * Analyze performance metrics
 */
function analyzePerformanceMetric(metric, analysis) {
  const operation = metric.operation;
  
  if (!analysis.performance.operations[operation]) {
    analysis.performance.operations[operation] = {
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      successRate: 0,
      successCount: 0,
    };
  }

  const op = analysis.performance.operations[operation];
  op.count++;
  op.totalDuration += metric.duration;
  op.minDuration = Math.min(op.minDuration, metric.duration);
  op.maxDuration = Math.max(op.maxDuration, metric.duration);
  
  if (metric.success) {
    op.successCount++;
  }

  // Track slow operations (>2 seconds)
  if (metric.duration > 2000) {
    analysis.performance.slowOperations.push({
      operation,
      duration: metric.duration,
      timestamp: metric.timestamp,
      metadata: metric.metadata,
    });
  }
}

/**
 * Analyze error metrics
 */
function analyzeErrorMetric(metric, analysis) {
  analysis.errors.total++;
  
  const severity = metric.severity;
  analysis.errors.bySeverity[severity] = (analysis.errors.bySeverity[severity] || 0) + 1;
  
  if (metric.component) {
    const component = metric.component;
    analysis.errors.byComponent[component] = (analysis.errors.byComponent[component] || 0) + 1;
  }
}

/**
 * Analyze interaction metrics
 */
function analyzeInteractionMetric(metric, analysis) {
  analysis.userInteractions.total++;
  
  const action = metric.action;
  analysis.userInteractions.byAction[action] = (analysis.userInteractions.byAction[action] || 0) + 1;
  
  const page = metric.page;
  analysis.userInteractions.byPage[page] = (analysis.userInteractions.byPage[page] || 0) + 1;
}

/**
 * Analyze resource metrics
 */
function analyzeResourceMetric(metric, analysis) {
  if (metric.resourceType === 'memory' && metric.unit === 'bytes') {
    const memoryMB = metric.value / (1024 * 1024);
    analysis.resources.memoryUsage.samples++;
    analysis.resources.memoryUsage.average = 
      (analysis.resources.memoryUsage.average * (analysis.resources.memoryUsage.samples - 1) + memoryMB) / 
      analysis.resources.memoryUsage.samples;
    analysis.resources.memoryUsage.peak = Math.max(analysis.resources.memoryUsage.peak, memoryMB);
  }
}

/**
 * Calculate derived metrics
 */
function calculateDerivedMetrics(analysis) {
  // Calculate average durations and success rates for operations
  Object.keys(analysis.performance.operations).forEach(operation => {
    const op = analysis.performance.operations[operation];
    op.averageDuration = op.totalDuration / op.count;
    op.successRate = op.successCount / op.count;
  });

  // Calculate overall average duration
  const totalDuration = Object.values(analysis.performance.operations)
    .reduce((sum, op) => sum + op.totalDuration, 0);
  const totalOperations = Object.values(analysis.performance.operations)
    .reduce((sum, op) => sum + op.count, 0);
  
  if (totalOperations > 0) {
    analysis.performance.averageDuration = totalDuration / totalOperations;
  }

  // Calculate error rate
  const totalEvents = analysis.summary.totalMetrics;
  if (totalEvents > 0) {
    analysis.errors.errorRate = analysis.errors.total / totalEvents;
  }
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(analysis) {
  const recommendations = [];

  // Check for slow operations
  const slowOps = Object.entries(analysis.performance.operations)
    .filter(([_, op]) => op.averageDuration > 2000)
    .sort((a, b) => b[1].averageDuration - a[1].averageDuration);

  if (slowOps.length > 0) {
    recommendations.push({
      type: 'performance',
      severity: 'high',
      title: 'Slow Operations Detected',
      description: `${slowOps.length} operations are taking longer than 2 seconds on average`,
      details: slowOps.slice(0, 5).map(([op, data]) => ({
        operation: op,
        averageDuration: Math.round(data.averageDuration),
        count: data.count,
      })),
      suggestions: [
        'Implement caching for frequently used operations',
        'Optimize database queries and API calls',
        'Consider code splitting for large operations',
        'Add loading states to improve perceived performance',
      ],
    });
  }

  // Check for high error rates
  if (analysis.errors.errorRate > 0.05) { // 5% error rate
    recommendations.push({
      type: 'reliability',
      severity: 'high',
      title: 'High Error Rate',
      description: `Error rate is ${(analysis.errors.errorRate * 100).toFixed(2)}%, which is above the 5% threshold`,
      details: {
        totalErrors: analysis.errors.total,
        errorRate: analysis.errors.errorRate,
        bySeverity: analysis.errors.bySeverity,
      },
      suggestions: [
        'Implement better error handling and retry logic',
        'Add input validation to prevent user errors',
        'Monitor and fix the most common error sources',
        'Improve error messages and user guidance',
      ],
    });
  }

  // Check for memory usage
  if (analysis.resources.memoryUsage.peak > 200) { // 200MB
    recommendations.push({
      type: 'memory',
      severity: 'medium',
      title: 'High Memory Usage',
      description: `Peak memory usage is ${analysis.resources.memoryUsage.peak.toFixed(2)}MB`,
      details: {
        peak: analysis.resources.memoryUsage.peak,
        average: analysis.resources.memoryUsage.average,
      },
      suggestions: [
        'Implement virtual scrolling for large lists',
        'Clear unused caches and references',
        'Optimize image and PDF loading',
        'Use lazy loading for heavy components',
      ],
    });
  }

  // Check for low user engagement
  const avgInteractionsPerSession = analysis.userInteractions.total / 
    (analysis.summary.metricTypes.interaction || 1);
  
  if (avgInteractionsPerSession < 5) {
    recommendations.push({
      type: 'usability',
      severity: 'low',
      title: 'Low User Engagement',
      description: `Average interactions per session is ${avgInteractionsPerSession.toFixed(2)}`,
      details: {
        totalInteractions: analysis.userInteractions.total,
        byAction: analysis.userInteractions.byAction,
      },
      suggestions: [
        'Improve user onboarding and guidance',
        'Add more interactive features',
        'Simplify complex workflows',
        'Provide better visual feedback for actions',
      ],
    });
  }

  analysis.recommendations = recommendations;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(analysis) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; font-size: 0.9em; }
        .recommendation { margin: 15px 0; padding: 20px; border-radius: 6px; }
        .recommendation.high { background: #fff5f5; border-left: 4px solid #e53e3e; }
        .recommendation.medium { background: #fffbf0; border-left: 4px solid #dd6b20; }
        .recommendation.low { background: #f0fff4; border-left: 4px solid #38a169; }
        .operations-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .operations-table th, .operations-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .operations-table th { background: #f8f9fa; }
        .slow-operation { color: #e53e3e; font-weight: bold; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Performance Analysis Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        
        <h2>Summary</h2>
        <div class="summary">
            <div class="metric-card">
                <div class="metric-value">${analysis.summary.totalMetrics}</div>
                <div class="metric-label">Total Metrics</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${analysis.performance.averageDuration.toFixed(0)}ms</div>
                <div class="metric-label">Avg Operation Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${analysis.errors.total}</div>
                <div class="metric-label">Total Errors</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(analysis.errors.errorRate * 100).toFixed(2)}%</div>
                <div class="metric-label">Error Rate</div>
            </div>
        </div>

        <h2>Performance Operations</h2>
        <table class="operations-table">
            <thead>
                <tr>
                    <th>Operation</th>
                    <th>Count</th>
                    <th>Avg Duration</th>
                    <th>Max Duration</th>
                    <th>Success Rate</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(analysis.performance.operations)
                  .sort((a, b) => b[1].averageDuration - a[1].averageDuration)
                  .map(([op, data]) => `
                    <tr>
                        <td class="${data.averageDuration > 2000 ? 'slow-operation' : ''}">${op}</td>
                        <td>${data.count}</td>
                        <td>${data.averageDuration.toFixed(0)}ms</td>
                        <td>${data.maxDuration.toFixed(0)}ms</td>
                        <td>${(data.successRate * 100).toFixed(1)}%</td>
                    </tr>
                  `).join('')}
            </tbody>
        </table>

        <h2>Recommendations</h2>
        ${analysis.recommendations.map(rec => `
            <div class="recommendation ${rec.severity}">
                <h3>${rec.title}</h3>
                <p>${rec.description}</p>
                <ul>
                    ${rec.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            </div>
        `).join('')}

        <h2>Raw Data</h2>
        <pre>${JSON.stringify(analysis, null, 2)}</pre>
    </div>
</body>
</html>
  `;

  return html;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing performance metrics...');
  
  const metrics = loadMetrics();
  console.log(`📊 Loaded ${metrics.length} metrics`);
  
  if (metrics.length === 0) {
    console.log('ℹ️  No metrics to analyze. Make sure to run the application first.');
    return;
  }

  const analysis = analyzeMetrics(metrics);
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write JSON report
  const jsonReportPath = path.join(OUTPUT_DIR, REPORT_FILE);
  fs.writeFileSync(jsonReportPath, JSON.stringify(analysis, null, 2));
  console.log(`📄 JSON report written to ${jsonReportPath}`);

  // Write HTML report
  const htmlReport = generateHTMLReport(analysis);
  const htmlReportPath = path.join(OUTPUT_DIR, 'performance-report.html');
  fs.writeFileSync(htmlReportPath, htmlReport);
  console.log(`🌐 HTML report written to ${htmlReportPath}`);

  // Print summary
  console.log('\n📈 Performance Summary:');
  console.log(`   Total metrics: ${analysis.summary.totalMetrics}`);
  console.log(`   Average operation time: ${analysis.performance.averageDuration.toFixed(0)}ms`);
  console.log(`   Error rate: ${(analysis.errors.errorRate * 100).toFixed(2)}%`);
  console.log(`   Recommendations: ${analysis.recommendations.length}`);

  if (analysis.recommendations.length > 0) {
    console.log('\n⚠️  Top Recommendations:');
    analysis.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.title} (${rec.severity})`);
    });
  }

  console.log(`\n✅ Analysis complete! Open ${htmlReportPath} to view the full report.`);
}

// Run the analysis
if (require.main === module) {
  main();
}

module.exports = { analyzeMetrics, loadMetrics };