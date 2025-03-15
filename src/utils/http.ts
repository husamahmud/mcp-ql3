import { IncomingMessage } from 'http'
import { Socket } from 'net'
import { Readable } from 'node:stream'
import getRawBody from 'raw-body'

/**
 * Interface defining options for creating a fake IncomingMessage
 */
export interface FakeIncomingMessageOptions {
  method?: string;
  url?: string;
  headers?: IncomingMessage['headers'];
  body?: string | Buffer | Record<string, any> | null;
  socket?: Socket;
}

/**
 * Create a fake IncomingMessage for testing or simulation
 * @param options - Options for creating the fake message
 * @returns An IncomingMessage instance
 */
export function createFakeIncomingMessage(
  options: FakeIncomingMessageOptions = {},
): IncomingMessage {
  const {
    method = 'GET',
    url = '/',
    headers = {},
    body = null,
    socket = new Socket(),
  } = options

  const readable = new Readable()

  // Create the IncomingMessage instance
  const req = new IncomingMessage(socket)

  // Set basic properties
  req.method = method
  req.url = url
  req.headers = headers

  // Add body content if provided
  if (body) {
    if (typeof body === 'string') {
      readable.push(body)
    } else if (Buffer.isBuffer(body)) {
      readable.push(body)
    } else {
      readable.push(JSON.stringify(body))
    }
    readable.push(null) // Signal the end of the stream
  }

  // Create a proxy for event handling that preserves correct types
  const originalOn = req.on.bind(req)
  const originalOnce = req.once.bind(req)

  // Override event methods to handle both IncomingMessage and Readable events
  req.on = function(event: string, listener: (...args: any[]) => void): IncomingMessage {
    if (['data', 'end', 'readable'].includes(event)) {
      readable.on(event, listener)
    }
    originalOn(event, listener)
    return req
  } as IncomingMessage['on']

  req.once = function(event: string, listener: (...args: any[]) => void): IncomingMessage {
    if (['data', 'end', 'readable'].includes(event)) {
      readable.once(event, listener)
    }
    originalOnce(event, listener)
    return req
  } as IncomingMessage['once']

  // Add necessary readable stream methods with proper typing
  req.read = (size?: number) => {
    return readable.read(size)
  }

  // Make it pipe-able while maintaining IncomingMessage type
  const originalPipe = req.pipe.bind(req)
  req.pipe = function <T extends NodeJS.WritableStream>(destination: T, options?: {
    end?: boolean;
  }): T {
    readable.pipe(destination, options)
    return originalPipe(destination, options)
  }

  return req
}

/**
 * Parse the raw body from an IncomingMessage
 * @param req - The request to parse the body from
 * @returns The parsed body as a string
 */
export async function parseRequestBody(req: IncomingMessage): Promise<string> {
  return getRawBody(req, {
    length: req.headers['content-length'],
    encoding: 'utf-8',
  })
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const createSuccessResponse = <T>(data: T) => ({
  success: true,
  data,
});

export const createErrorResponse = (error: Error | HttpError) => {
  if (error instanceof HttpError) {
    return {
      success: false,
      error: {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      },
    };
  }

  return {
    success: false,
    error: {
      message: error.message,
      statusCode: 500,
    },
  };
};
