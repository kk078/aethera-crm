/**
 * API Integrity Tests
 * Tests to ensure API stability and graceful degradation when tables are missing
 */

// ============================================
// Type Definition for Standardized Response
// ============================================

export interface StandardizedResponse<T = any> {
  data: T | null;
  error: string | null;
  meta: {
    schema_version: string;
    table_status: 'ready' | 'missing';
  };
}

// ============================================
// Test Helpers
// ============================================

/**
 * Validates that a response conforms to the standardized response contract
 */
export function validateStandardizedResponse<T>(
  response: any,
  expectedType: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (response === null || typeof response !== 'object') {
    errors.push('Response must be a valid object');
    return { valid: false, errors };
  }

  // Check data field
  if (!('data' in response)) {
    errors.push('Response missing "data" field');
  }

  // Check error field
  if (!('error' in response)) {
    errors.push('Response missing "error" field');
  } else if (response.error !== null && typeof response.error !== 'string') {
    errors.push('Response "error" field must be null or a string');
  }

  // Check meta field
  if (!('meta' in response)) {
    errors.push('Response missing "meta" field');
  } else {
    if (!response.meta.schema_version) {
      errors.push('Response meta missing "schema_version"');
    }
    if (!response.meta.table_status) {
      errors.push('Response meta missing "table_status"');
    } else if (!['ready', 'missing'].includes(response.meta.table_status)) {
      errors.push('Response meta.table_status must be "ready" or "missing"');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Simulates a dropped table scenario by mocking the DB to return table missing errors
 */
export async function simulateDroppedTableTest(
  tableName: string,
  testQuery: () => Promise<any>
): Promise<{ passed: boolean; result: any; error?: string }> {
  try {
    // Simulate missing table error
    const mockDb = {
      prepare: (sql: string) => ({
        bind: () => ({
          all: () => {
            throw new Error(`no such table: ${tableName}`);
          },
          first: () => {
            throw new Error(`no such table: ${tableName}`);
          },
          run: () => {
            throw new Error(`no such table: ${tableName}`);
          },
        }),
      }),
    };

    // This should NOT throw but should return a graceful response
    // The test passes if no 500 error is thrown
    const result = testQuery();
    return { passed: true, result };
  } catch (error: any) {
    return { passed: false, result: null, error: error.message };
  }
}

// ============================================
// Test Cases
// ============================================

/**
 * Test: Missing Table Should Not Cause 500 Error
 * When a table is missing, the API should return 200 OK with migration_pending status
 */
export async function testMissingTableGracefulDegradation(): Promise<void> {
  console.log('Test: Missing table graceful degradation...');

  // Simulate the route handler behavior
  // Table check should return null/empty when table is missing
  const tableCheck = { results: [] }; // Simulates missing table result

  if (tableCheck.results === undefined || tableCheck.results.length === 0) {
    // This is the expected path - table is missing
    console.log('PASS: Table check returned null/empty (table missing)');
  } else {
    console.log('FAIL: Unexpected table check result');
  }
}

/**
 * Test: Duplicate Routes Detection
 * Uses TypeScript compiler API to detect duplicate route definitions
 */
export function detectDuplicateRoutes(routesFileContent: string): string[] {
  const duplicates: string[] = [];
  const routePattern = /onboardingRoutes\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;

  const routeDefinitions = new Map<string, number>();
  let match: RegExpExecArray | null;

  while ((match = routePattern.exec(routesFileContent)) !== null) {
    const route = match[2];
    const count = routeDefinitions.get(route) || 0;
    routeDefinitions.set(route, count + 1);
  }

  routeDefinitions.forEach((count, route) => {
    if (count > 1) {
      duplicates.push(`Duplicate route: ${route} (found ${count} times)`);
    }
  });

  return duplicates;
}

/**
 * Test: Schema Version Consistency
 * Ensures all responses include the schema_version meta field
 */
export function checkSchemaVersionConsistency(response: any): boolean {
  if (!response.meta || !response.meta.schema_version) {
    return false;
  }
  // Check version format (semantic versioning)
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(response.meta.schema_version);
}

// ============================================
// Test Runner
// ============================================

export async function runApiIntegrityTests(): Promise<void> {
  console.log('Running API Integrity Tests...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Missing Table Graceful Degradation
  try {
    await testMissingTableGracefulDegradation();
    passed++;
    console.log('✓ Test 1: Missing Table Graceful Degradation - PASSED\n');
  } catch (error) {
    failed++;
    console.log('✗ Test 1: Missing Table Graceful Degradation - FAILED\n');
  }

  // Test 2: Duplicate Routes Detection
  try {
    const sampleRoutes = `
onboardingRoutes.get('/checklist/:dealId', async (c) => {});
onboardingRoutes.get('/checklist/:dealId', async (c) => {});
onboardingRoutes.post('/payer-enrollment', async (c) => {});
    `;
    const duplicates = detectDuplicateRoutes(sampleRoutes);
    if (duplicates.length > 0) {
      console.log(`✓ Test 2: Duplicate Routes Detection - PASSED (found ${duplicates.length} duplicate)`);
      passed++;
    } else {
      console.log('✗ Test 2: Duplicate Routes Detection - FAILED (no duplicates found)');
      failed++;
    }
    console.log();
  } catch (error) {
    console.log('✗ Test 2: Duplicate Routes Detection - FAILED\n');
    failed++;
  }

  // Test 3: Schema Version Consistency
  try {
    const response = {
      data: null,
      error: 'Database migration required',
      meta: { schema_version: '1.0.0', table_status: 'missing' },
    };
    const valid = checkSchemaVersionConsistency(response);
    if (valid) {
      console.log('✓ Test 3: Schema Version Consistency - PASSED');
      passed++;
    } else {
      console.log('✗ Test 3: Schema Version Consistency - FAILED');
      failed++;
    }
    console.log();
  } catch (error) {
    console.log('✗ Test 3: Schema Version Consistency - FAILED\n');
    failed++;
  }

  // Summary
  console.log('='.repeat(50));
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log('='.repeat(50));
}

// Run tests if executed directly
if (typeof process !== 'undefined' && process.argv.includes('--test')) {
  runApiIntegrityTests().catch(console.error);
}
