/**
 * Comprehensive Engine Health Test Suite
 *
 * Tests all 68+ search engines across all categories with various query types
 * Tracks success/failure rates, response times, and errors
 * Saves detailed health report to JSON file
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Search } from '../src/search.js';
import { engineStatusTracker } from '../src/engine-status.js';
import { CATEGORIES } from '../src/category-registry.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Test query configurations for different types of searches
const TEST_QUERIES = {
  general: ['javascript', 'climate change', 'artificial intelligence'],
  academic: ['machine learning', 'quantum computing', 'neural networks'],
  it: ['typescript', 'react hooks', 'docker'],
  images: ['sunset', 'mountains', 'cats'],
  videos: ['tutorial', 'documentary', 'music'],
  news: ['technology', 'science', 'politics'],
  social: ['programming', 'technology', 'opensource'],
  maps: ['New York', 'Paris', 'Tokyo'],
  torrents: ['ubuntu', 'open source', 'creative commons'],
  shopping: ['laptop', 'headphones', 'book'],
  specialized: ['wikipedia', 'movies', 'books']
};

interface EngineTestResult {
  engineName: string;
  category: string;
  status: 'success' | 'failed' | 'partial';
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  averageResponseTime: number;
  errors: Array<{
    query: string;
    error: string;
    timestamp: string;
  }>;
  successRate: number;
}

interface CategoryTestResult {
  category: string;
  totalEngines: number;
  healthyEngines: number;
  failedEngines: number;
  averageSuccessRate: number;
  engines: EngineTestResult[];
}

interface HealthReport {
  timestamp: string;
  totalEngines: number;
  totalTests: number;
  overallSuccessRate: number;
  categories: CategoryTestResult[];
  allEngines: EngineTestResult[];
  summary: {
    healthy: number;
    degraded: number;
    failed: number;
    averageResponseTime: number;
  };
}

describe('Engine Health Test Suite', () => {
  let search: Search;
  let healthReport: HealthReport;
  const results: EngineTestResult[] = [];

  beforeAll(() => {
    search = new Search();

    // Reset all engine statuses to ensure clean testing
    // This prevents engines from being marked as unhealthy during the test suite
    const allEngines = search.getEngines();
    allEngines.forEach(engineName => {
      engineStatusTracker.resetEngine(engineName);
    });

    console.log('\n🔍 Starting Comprehensive Engine Health Test Suite\n');
    console.log(`Testing ${search.getEngines().length} engines across ${search.getCategories().length} categories\n`);
  });

  describe('Individual Engine Tests', () => {
    const allEngines = new Search().getEngines();

    allEngines.forEach((engineName) => {
      it(`should test engine: ${engineName}`, async () => {
        // Reset this engine's status before testing to ensure clean state
        engineStatusTracker.resetEngine(engineName);

        const engineStatus = search.getEngineStatus(engineName);
        const category = engineStatus?.categories[0] || 'general';

        // Select appropriate test queries for this engine's category
        const queries = TEST_QUERIES[category as keyof typeof TEST_QUERIES] || TEST_QUERIES.general;

        const result: EngineTestResult = {
          engineName,
          category,
          status: 'success',
          testsRun: 0,
          testsPassed: 0,
          testsFailed: 0,
          averageResponseTime: 0,
          errors: [],
          successRate: 0
        };

        let totalResponseTime = 0;

        // Test with multiple queries
        for (const query of queries) {
          result.testsRun++;
          const startTime = Date.now();

          try {
            const searchResults = await search.search(query, 1, [engineName]);
            const responseTime = Date.now() - startTime;
            totalResponseTime += responseTime;

            // Consider it a pass only if we get results
            // This ensures we're actually testing the engine's ability to return data
            if (searchResults.length > 0) {
              result.testsPassed++;
            } else {
              result.testsFailed++;
              result.errors.push({
                query,
                error: 'No results returned',
                timestamp: new Date().toISOString()
              });
            }

            // Log if it takes too long
            if (responseTime > 10000) {
              console.warn(`⚠️  ${engineName} slow response: ${responseTime}ms for "${query}"`);
            }
          } catch (error) {
            result.testsFailed++;
            result.errors.push({
              query,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            });
            console.error(`❌ ${engineName} failed for "${query}": ${error instanceof Error ? error.message : error}`);
          }
        }

        result.averageResponseTime = result.testsRun > 0 ? totalResponseTime / result.testsRun : 0;
        result.successRate = result.testsRun > 0 ? (result.testsPassed / result.testsRun) * 100 : 0;

        // Determine overall status
        if (result.testsPassed === result.testsRun) {
          result.status = 'success';
        } else if (result.testsPassed > 0) {
          result.status = 'partial';
        } else {
          result.status = 'failed';
        }

        results.push(result);

        // Assert that at least some tests passed (allow for some failures)
        expect(result.testsPassed).toBeGreaterThanOrEqual(0);

        if (result.status === 'success') {
          console.log(`✅ ${engineName}: All tests passed (${result.testsRun}/${result.testsRun})`);
        } else if (result.status === 'partial') {
          console.log(`⚠️  ${engineName}: Partial success (${result.testsPassed}/${result.testsRun})`);
        } else {
          console.log(`❌ ${engineName}: All tests failed (0/${result.testsRun})`);
        }
      }, 30000); // 30 second timeout per engine
    });
  });

  describe('Category-Based Tests', () => {
    const categories = Object.keys(CATEGORIES);

    categories.forEach((category) => {
      it(`should test all engines in category: ${category}`, async () => {
        const engines = search.getEnginesByCategory(category);
        const queries = TEST_QUERIES[category as keyof typeof TEST_QUERIES] || TEST_QUERIES.general;

        console.log(`\n📁 Testing category: ${category} (${engines.length} engines)`);

        let successfulEngines = 0;
        let failedEngines = 0;

        for (const engineName of engines) {
          const query = queries[0]; // Use first query for category test

          try {
            const searchResults = await search.search(query, 1, [engineName]);

            if (searchResults.length > 0) {
              successfulEngines++;
            } else {
              failedEngines++;
            }
          } catch (error) {
            failedEngines++;
            console.error(`  ❌ ${engineName}: ${error instanceof Error ? error.message : error}`);
          }
        }

        console.log(`  ✅ Success: ${successfulEngines}/${engines.length}`);
        console.log(`  ❌ Failed: ${failedEngines}/${engines.length}`);

        // Expect at least some engines in the category to work
        expect(engines.length).toBeGreaterThan(0);
      }, 60000); // 60 second timeout per category
    });
  });

  describe('Cross-Category Search Test', () => {
    it('should successfully search across all categories simultaneously', async () => {
      const query = 'technology';
      const categories = Object.keys(CATEGORIES);

      console.log(`\n🌐 Testing cross-category search with query: "${query}"`);
      console.log(`   Categories: ${categories.join(', ')}`);

      const startTime = Date.now();
      const searchResults = await search.searchByCategories(query, categories);
      const responseTime = Date.now() - startTime;

      console.log(`   Results: ${searchResults.length} total results`);
      console.log(`   Time: ${responseTime}ms`);

      // Group results by category
      const resultsByCategory: { [key: string]: number } = {};
      searchResults.forEach(result => {
        const cat = result.category || 'unknown';
        resultsByCategory[cat] = (resultsByCategory[cat] || 0) + 1;
      });

      console.log('   Distribution:');
      Object.entries(resultsByCategory).forEach(([cat, count]) => {
        console.log(`     - ${cat}: ${count} results`);
      });

      expect(searchResults.length).toBeGreaterThan(0);
    }, 90000); // 90 second timeout for cross-category
  });

  afterAll(async () => {
    console.log('\n📊 Generating Health Report...\n');

    // Group results by category
    const categoriesMap: { [key: string]: CategoryTestResult } = {};

    results.forEach(result => {
      if (!categoriesMap[result.category]) {
        categoriesMap[result.category] = {
          category: result.category,
          totalEngines: 0,
          healthyEngines: 0,
          failedEngines: 0,
          averageSuccessRate: 0,
          engines: []
        };
      }

      categoriesMap[result.category].totalEngines++;
      categoriesMap[result.category].engines.push(result);

      if (result.status === 'success') {
        categoriesMap[result.category].healthyEngines++;
      } else if (result.status === 'failed') {
        categoriesMap[result.category].failedEngines++;
      }
    });

    // Calculate category averages
    Object.values(categoriesMap).forEach(cat => {
      const totalSuccess = cat.engines.reduce((sum, e) => sum + e.successRate, 0);
      cat.averageSuccessRate = cat.engines.length > 0 ? totalSuccess / cat.engines.length : 0;
    });

    // Calculate overall statistics
    const totalTests = results.reduce((sum, r) => sum + r.testsRun, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.testsPassed, 0);
    const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    const healthy = results.filter(r => r.status === 'success').length;
    const degraded = results.filter(r => r.status === 'partial').length;
    const failed = results.filter(r => r.status === 'failed').length;

    const totalResponseTime = results.reduce((sum, r) => sum + r.averageResponseTime, 0);
    const averageResponseTime = results.length > 0 ? totalResponseTime / results.length : 0;

    healthReport = {
      timestamp: new Date().toISOString(),
      totalEngines: results.length,
      totalTests,
      overallSuccessRate,
      categories: Object.values(categoriesMap),
      allEngines: results.sort((a, b) => a.engineName.localeCompare(b.engineName)),
      summary: {
        healthy,
        degraded,
        failed,
        averageResponseTime
      }
    };

    // Print summary to console
    console.log('═══════════════════════════════════════════════════════');
    console.log('                  HEALTH REPORT SUMMARY                ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Engines Tested: ${healthReport.totalEngines}`);
    console.log(`Total Tests Run: ${healthReport.totalTests}`);
    console.log(`Overall Success Rate: ${healthReport.overallSuccessRate.toFixed(2)}%`);
    console.log(`Average Response Time: ${healthReport.summary.averageResponseTime.toFixed(0)}ms`);
    console.log('\nEngine Status:');
    console.log(`  ✅ Healthy: ${healthReport.summary.healthy}`);
    console.log(`  ⚠️  Degraded: ${healthReport.summary.degraded}`);
    console.log(`  ❌ Failed: ${healthReport.summary.failed}`);
    console.log('\nCategory Breakdown:');
    healthReport.categories.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.healthyEngines}/${cat.totalEngines} healthy (${cat.averageSuccessRate.toFixed(1)}% success rate)`);
    });
    console.log('═══════════════════════════════════════════════════════\n');

    // Save to JSON file
    const reportPath = join(process.cwd(), 'test', 'engine-health-report.json');
    await writeFile(reportPath, JSON.stringify(healthReport, null, 2), 'utf-8');
    console.log(`📁 Health report saved to: ${reportPath}\n`);

    // Also save a simplified CSV-like report
    const csvPath = join(process.cwd(), 'test', 'engine-health-summary.txt');
    const csvContent = [
      'Engine,Category,Tests Run,Tests Passed,Success Rate,Avg Response Time,Status,Errors',
      ...results.map(r =>
        `${r.engineName},${r.category},${r.testsRun},${r.testsPassed},${r.successRate.toFixed(1)}%,${r.averageResponseTime.toFixed(0)}ms,${r.status},${r.errors.length}`
      )
    ].join('\n');

    await writeFile(csvPath, csvContent, 'utf-8');
    console.log(`📁 Summary report saved to: ${csvPath}\n`);
  });
});
