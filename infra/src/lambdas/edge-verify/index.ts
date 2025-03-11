import { CloudFrontRequestHandler } from 'aws-lambda';

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  // Get referer header
  const referer = headers.referer?.[0]?.value;

  // Extract domain and path from referer URL
  let refererUrl: URL;
  try {
    refererUrl = new URL(referer || '');
  } catch (error) {
    return {
      status: '403',
      statusDescription: 'Forbidden',
      body: JSON.stringify({
        error: 'Access denied',
        message: 'Invalid referer format',
        referer: referer || 'none',
      }),
    };
  }

  // Check if the hostname matches and path starts with /blog
  const isValidReferer =
    refererUrl.hostname === process.env.DOMAIN_NAME ||
    refererUrl.hostname === `www.${process.env.DOMAIN_NAME}` ||
    refererUrl.hostname === 'localhost' ||
    refererUrl.hostname === '127.0.0.1';

  if (!isValidReferer) {
    return {
      status: '403',
      statusDescription: 'Forbidden',
      body: JSON.stringify({
        error: 'Access denied',
        message: 'Request must come from alphabetize.ng',
        referer: referer || 'none',
      }),
    };
  }

  // Add the API key to the request
  request.headers['x-api-key'] = [
    {
      key: 'x-api-key',
      value: process.env.API_KEY || '',
    },
  ];

  return request;
};
