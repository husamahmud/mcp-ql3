import { VercelRequest, VercelResponse } from '@vercel/node';
import { createSuccessResponse, createErrorResponse, HttpError } from '@/utils/http';
import logger from '@/utils/logging';
import github from '@/services/github';

/**
 * API handler for Vercel deployment
 *
 * This serves as the entry point for the Vercel serverless function.
 * It initializes the MCP API handler with appropriate configuration.
 */
const handler = initializeMcpApiHandler()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Basic health check
    if (req.method === 'GET' && req.url === '/health') {
      return res.json(createSuccessResponse({ status: 'ok' }));
    }

    // Handle other routes here
    throw new HttpError(404, 'Not Found');
  } catch (error) {
    logger.error('API Error:', error);
    const errorResponse = createErrorResponse(error as Error);
    res.status(errorResponse.error.statusCode).json(errorResponse);
  }
}
