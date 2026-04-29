import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export const errorHandler = async (c: Context, next: () => Promise<void>) => {
  try {
    await next();
  } catch (error: any) {
    console.error('Error handler caught:', error);

    // Handle HTTP exceptions
    if (error instanceof HTTPException) {
      return c.json(
        {
          error: error.message,
          status: error.status,
        },
        error.status
      );
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          status: 400,
        },
        400
      );
    }

    // Handle database errors
    if (error instanceof Error && error.message.includes('SQLITE')) {
      return c.json(
        {
          error: 'Database Error',
          message: 'An error occurred while accessing the database',
          status: 500,
        },
        500
      );
    }

    // Handle all other errors
    // Always show details for debugging
    return c.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'Unknown error',
        stack: error.stack || undefined,
        status: 500,
      },
      500
    );
  }
};
