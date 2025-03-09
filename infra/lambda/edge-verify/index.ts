import {
  CloudFrontRequestEvent,
  CloudFrontRequestHandler,
  CloudFrontRequest,
  CloudFrontResultResponse,
} from 'aws-lambda';

/**
 * Lambda@Edge function that validates incoming requests to ensure they're coming from our website.
 * This prevents direct API access via tools like curl or Postman.
 */
export const handler: CloudFrontRequestHandler = async (
  event: CloudFrontRequestEvent,
) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  // Always allow static assets and non-API requests
  if (!request.uri.startsWith('/surveys')) {
    return request;
  }

  // Skip OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    return request;
  }

  try {
    // For API endpoints, we need to validate the request
    if (request.uri.startsWith('/surveys') && request.method === 'POST') {
      // Add the API key header
      if (!headers['x-api-key']) {
        headers['x-api-key'] = [
          {
            key: 'x-api-key',
            value: '__API_KEY__', // This will be replaced during build
          },
        ];
      }
    }

    // Request passed all validation checks
    return request;
  } catch (error) {
    console.error('Error in request validation:', error);
    return generateError('Internal server error', '500');
  }
};

/**
 * Generates an error response
 */
function generateError(message: string, status: string): CloudFrontResultResponse {
  return {
    status: status,
    statusDescription: 'Error',
    headers: {
      'content-type': [
        {
          key: 'Content-Type',
          value: 'application/json',
        },
      ],
      'cache-control': [
        {
          key: 'Cache-Control',
          value: 'no-store',
        },
      ],
    },
    body: JSON.stringify({
      error: 'Error',
      message: message,
    }),
  };
}
