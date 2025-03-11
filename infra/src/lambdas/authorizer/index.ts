import {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from 'aws-lambda';

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  console.log('[DEBUG] Authorizer event:', JSON.stringify(event, null, 2));

  const apiKey = event.headers?.['x-api-key'];
  const expectedApiKey = process.env.API_KEY || '';
  const domainName = process.env.DOMAIN_NAME || '';
  const referer = event.headers?.['Referer'] || event.headers?.['referer'];

  console.log('[DEBUG] Checking authorization:', {
    hasApiKey: !!apiKey,
    expectedApiKey: expectedApiKey,
    referer,
    isTestInvoke: event.requestContext?.stage?.includes('ESTestInvoke'),
  });

  // Allow test invocations from API Gateway console if API key matches
  if (event.requestContext?.stage?.includes('ESTestInvoke')) {
    const isAuthorized = apiKey === expectedApiKey;
    console.log('[DEBUG] Test invocation result:', { isAuthorized });

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: isAuthorized ? 'Allow' : 'Deny',
            Resource: event.methodArn,
          },
        ],
      },
    };
  }

  // For regular requests, check both API key and referer
  const isValidReferer =
    referer &&
    (referer.startsWith(`https://${domainName}/`) ||
      referer.startsWith(`https://www.${domainName}/`) ||
      referer.startsWith(`http://localhost:5173/`) ||
      referer.startsWith(`http://127.0.0.1:5173/`));

  const isAuthorized = apiKey === expectedApiKey && isValidReferer;

  console.log('[DEBUG] Authorization result:', {
    isValidReferer,
    hasValidApiKey: apiKey === expectedApiKey,
    isAuthorized,
    refererCheck: {
      referer,
      expectedPattern: `https://${domainName}/`,
    },
  });

  return {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: isAuthorized ? 'Allow' : 'Deny',
          Resource: event.methodArn,
        },
      ],
    },
  };
};
