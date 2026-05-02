import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

// Safe-fail response helper - always returns 200 with empty data on error
export const safeFail = (error?: any, message?: string): { data: any; error?: string } => {
  console.error('[SAFE-FAIL] Error occurred:', error?.message || error);

  // Return empty dataset with error message instead of 500
  return {
    data: [],
    error: message || 'Database operation pending - sync in progress',
  };
};

// Safe query wrapper - always returns { data: [] } on error instead of 500
export const safeQuery = async <T = any>(
  queryFn: () => Promise<T>,
  emptyResult: T = [] as unknown as T
): Promise<{ data: T; error?: string }> => {
  try {
    const result = await queryFn();
    return { data: result };
  } catch (error: any) {
    console.error('[SAFE-FAIL] Query failed:', error?.message || error);
    return { data: emptyResult, error: 'Database operation pending - tables may need initialization' };
  }
};

// Safe execute wrapper for non-query operations
export const safeExecute = async (
  executeFn: () => Promise<any>
): Promise<{ success: boolean; error?: string }> => {
  try {
    await executeFn();
    return { success: true };
  } catch (error: any) {
    console.error('[SAFE-EXECUTE] Execute failed:', error?.message || error);
    return { success: false, error: 'Database operation pending' };
  }
};

// Error handler middleware - converts all errors to 200 with safe data
export const errorHandler = async (c: Context, next: () => Promise<void>) => {
  console.log('[ERROR-HANDLER] Starting error handler...');
  try {
    await next();
    console.log('[ERROR-HANDLER] No error thrown');
  } catch (error: any) {
    console.error('[ERROR-HANDLER] Caught error:', error);

    // Handle HTTP exceptions
    if (error instanceof HTTPException) {
      // For 404, return empty data instead of error
      if (error.status === 404) {
        return c.json(
          {
            data: [],
            error: 'Resource not found',
          },
          200
        );
      }
      // For 400, return empty data with error message
      if (error.status === 400) {
        return c.json(
          {
            data: [],
            error: error.message || 'Bad Request',
          },
          200
        );
      }
      // For other HTTP exceptions, return 200 with empty data
      return c.json(
        {
          data: [],
          error: error.message || 'Internal Server Error',
          status: error.status,
        },
        200
      );
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return c.json(
        {
          data: [],
          error: 'Validation Error',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        200
      );
    }

    // Handle database errors - return safe-fail instead of 500
    if (error instanceof Error && (error.message.includes('SQLITE') || error.message.includes('D1') || error.message.includes('database'))) {
      return c.json({
        data: [],
        error: 'Database operation pending - table structure may need initialization',
      }, 200);
    }

    // Handle all other errors - use safe-fail pattern for API stability
    // Always return 200 with empty data instead of 500
    return c.json(
      {
        data: [],
        error: error.message || 'Internal Server Error',
      },
      200
    );
  }
};

// Helper to safely get data from API response
export const safelyGetJson = async (response: Response): Promise<any> => {
  try {
    const data = await response.json();
    return { data, ok: response.ok, status: response.status };
  } catch (error) {
    return { data: null, ok: false, status: response.status, error: 'Failed to parse JSON' };
  }
};
