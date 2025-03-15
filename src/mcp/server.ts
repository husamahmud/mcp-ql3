import express from 'express';
import { environment } from '@/config/environment';
import logger from '@/utils/logging';
import { createErrorResponse } from '@/utils/http';

const app = express();

app.use(express.json());

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  const errorResponse = createErrorResponse(err);
  res.status(errorResponse.error.statusCode).json(errorResponse);
});

const start = async () => {
  try {
    app.listen(environment.port, () => {
      logger.info(`Server is running on port ${environment.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
