#!/usr/bin/env node

/**
 * Deployment preparation script
 * Validates environment, runs tests, builds production bundle, and checks deployment readiness
 */

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, existsSync, statSync, readdirSync } = require('fs');
const { join } = require('path');

const rootDir = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logStep = (step, message) => {
  log(`\n[${step}] ${message}`, 'cyan');
};

const logSuccess = (message) => {
  log(`✅ ${message}`, 'green');
};

const logWarning = (message) => {
  log(`⚠️  ${message}`, 'yellow');
};

const logError = (message) => {
  log(`❌ ${message}`, 'red');
};

// Utility functions
const runCommand = (command, options = {}) => {
  try {
    const result = execSync(command, { 
      cwd: rootDir, 
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
};

const checkFileExists = (filePath) => {
  const fullPath = join(rootDir, filePath);
  return existsSync(fullPath);
};

const getFileSize = (filePath) => {
  const fullPath = join(rootDir, filePath);
  if (!existsSync(fullPath)) return 0;
  return statSync(fullPath).size;
};

const readJsonFile = (filePath) => {
  try {
    const fullPath = join(rootDir, filePath);
    const content = readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};

// Validation functions
const validateEnvironment = () => {
  logStep('1', 'Validating Environment');
  
  const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'src/main.tsx',
    'src/App.tsx',
    '.env'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    if (checkFileExists(file)) {
      logSuccess(`Found ${file}`);
    } else {
      logError(`Missing required file: ${file}`);
      allFilesExist = false;
    }
  }
  
  // Check environment variables
  const envPath = join(rootDir, '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    
    for (const varName of requiredVars) {
      if (envContent.includes(varName)) {
        logSuccess(`Environment variable ${varName} is set`);
      } else {
        logError(`Missing environment variable: ${varName}`);
        allFilesExist = false;
      }
    }
  }
  
  return allFilesExist;
};

const runTests = () => {
  logStep('2', 'Running Tests');
  
  // Run linting
  log('Running ESLint...');
  const lintResult = runCommand('npm run lint', { silent: true });
  if (lintResult.success) {
    logSuccess('Linting passed');
  } else {
    logWarning('Linting issues found (continuing anyway)');
  }
  
  // Run tests
  log('Running test suite...');
  const testResult = runCommand('npm run test:run', { silent: true });
  if (testResult.success) {
    logSuccess('All tests passed');
    return true;
  } else {
    logWarning('Some tests failed (continuing anyway for deployment preparation)');
    return false;
  }
};

const buildProduction = () => {
  logStep('3', 'Building Production Bundle');
  
  log('Creating production build...');
  const buildResult = runCommand('npm run build');
  
  if (!buildResult.success) {
    logError('Production build failed');
    return false;
  }
  
  logSuccess('Production build completed');
  
  // Check if dist directory exists
  if (!checkFileExists('dist')) {
    logError('Build output directory (dist) not found');
    return false;
  }
  
  logSuccess('Build output directory created');
  return true;
};

const analyzeBundleSize = () => {
  logStep('4', 'Analyzing Bundle Size');
  
  const distPath = join(rootDir, 'dist');
  if (!existsSync(distPath)) {
    logError('Dist directory not found');
    return false;
  }
  
  // Check main bundle files
  const jsFiles = [];
  const cssFiles = [];
  
  try {
    const jsDir = join(distPath, 'js');
    if (existsSync(jsDir)) {
      const files = readdirSync(jsDir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile()) {
          const filePath = join('dist', 'js', file.name);
          const size = getFileSize(filePath);
          
          if (file.name.endsWith('.js')) {
            jsFiles.push({ name: file.name, size });
          }
        }
      }
    }
    
    // Check CSS files
    const cssDir = join(distPath, 'css');
    if (existsSync(cssDir)) {
      const cssFileList = readdirSync(cssDir, { withFileTypes: true });
      for (const file of cssFileList) {
        if (file.isFile() && file.name.endsWith('.css')) {
          const filePath = join('dist', 'css', file.name);
          const size = getFileSize(filePath);
          cssFiles.push({ name: file.name, size });
        }
      }
    }
  } catch (error) {
    logWarning('Could not analyze bundle size in detail');
  }
  
  // Calculate total size
  const totalJsSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
  const totalCssSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
  const totalSize = totalJsSize + totalCssSize;
  
  log(`Total JavaScript: ${Math.round(totalJsSize / 1024)}KB`);
  log(`Total CSS: ${Math.round(totalCssSize / 1024)}KB`);
  log(`Total Bundle Size: ${Math.round(totalSize / 1024)}KB`);
  
  // Check against performance budget (1MB)
  const budgetLimit = 1024 * 1024; // 1MB
  if (totalSize > budgetLimit) {
    logWarning(`Bundle size (${Math.round(totalSize / 1024)}KB) exceeds recommended limit (${Math.round(budgetLimit / 1024)}KB)`);
  } else {
    logSuccess(`Bundle size within performance budget`);
  }
  
  return true;
};

const validateBuildOutput = () => {
  logStep('5', 'Validating Build Output');
  
  const requiredFiles = [
    'dist/index.html',
    'dist/js',
    'dist/css'
  ];
  
  let allValid = true;
  
  for (const file of requiredFiles) {
    if (checkFileExists(file)) {
      logSuccess(`Found ${file}`);
    } else {
      logError(`Missing build output: ${file}`);
      allValid = false;
    }
  }
  
  // Check index.html content
  const indexPath = join(rootDir, 'dist', 'index.html');
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, 'utf8');
    
    if (indexContent.includes('<script')) {
      logSuccess('JavaScript files linked in index.html');
    } else {
      logError('No JavaScript files found in index.html');
      allValid = false;
    }
    
    if (indexContent.includes('<link') && indexContent.includes('stylesheet')) {
      logSuccess('CSS files linked in index.html');
    } else {
      logWarning('No CSS files found in index.html (may be inlined)');
    }
  }
  
  return allValid;
};

const generateDeploymentReport = (results) => {
  logStep('6', 'Generating Deployment Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    results: results,
    recommendations: []
  };
  
  // Add recommendations based on results
  if (!results.testsPass) {
    report.recommendations.push('Fix failing tests before deploying to production');
  }
  
  if (!results.environmentValid) {
    report.recommendations.push('Ensure all required environment variables are set');
  }
  
  if (!results.buildSuccess) {
    report.recommendations.push('Fix build errors before deployment');
  }
  
  // Write report to file
  const reportPath = join(rootDir, 'deployment-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess(`Deployment report generated: deployment-report.json`);
  
  return report;
};

// Main execution
const main = () => {
  log('🚀 AI CV Improvement Platform - Deployment Preparation', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  const results = {
    environmentValid: false,
    testsPass: false,
    buildSuccess: false,
    bundleAnalyzed: false,
    outputValid: false
  };
  
  try {
    // Step 1: Validate environment
    results.environmentValid = validateEnvironment();
    
    // Step 2: Run tests
    results.testsPass = runTests();
    
    // Step 3: Build production
    results.buildSuccess = buildProduction();
    
    // Step 4: Analyze bundle
    if (results.buildSuccess) {
      results.bundleAnalyzed = analyzeBundleSize();
    }
    
    // Step 5: Validate build output
    if (results.buildSuccess) {
      results.outputValid = validateBuildOutput();
    }
    
    // Step 6: Generate report
    const report = generateDeploymentReport(results);
    
    // Final summary
    log('\n' + '=' .repeat(60), 'magenta');
    log('📋 DEPLOYMENT READINESS SUMMARY', 'magenta');
    log('=' .repeat(60), 'magenta');
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
      logSuccess('✅ All checks passed! Ready for deployment.');
    } else {
      logWarning('⚠️  Some checks failed. Review the issues above.');
    }
    
    log('\nNext steps:');
    log('1. Review the deployment report: deployment-report.json');
    log('2. Address any failing checks if needed');
    log('3. Deploy the dist/ directory to your hosting platform');
    log('4. Configure environment variables on your hosting platform');
    log('5. Test the deployed application');
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    logError(`Deployment preparation failed: ${error.message}`);
    process.exit(1);
  }
};

// Run the script
try {
  main();
} catch (error) {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
}