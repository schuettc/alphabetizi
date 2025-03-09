import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const tableName = process.env.TABLE_NAME || '';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log('Request event:', event);

  try {
    // Set CORS headers for all responses
    const headers = {
      'Access-Control-Allow-Origin': '*', // Replace with specific domain in production
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json',
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Access-Control-Allow-Headers':
            'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: '',
      };
    }

    // Additional security check for x-api-key (beyond API Gateway validation)
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
    if (!apiKey) {
      console.warn('Missing API key in request headers');
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Missing API key' }),
      };
    }

    // Optional: Check for referer header for additional security
    // Note: This is redundant if we're already using Lambda@Edge
    // but adds an additional layer of defense
    const referer = event.headers['referer'] || event.headers['Referer'];
    if (!referer) {
      console.warn('Missing referer header');
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Missing referer header' }),
      };
    }

    // Process POST request
    if (event.httpMethod === 'POST' && event.body) {
      const requestBody = JSON.parse(event.body);

      if (!requestBody.answers || !Array.isArray(requestBody.answers)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Answers array is required' }),
        };
      }

      const item = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        answers: requestBody.answers,
        metadata: {
          ...(requestBody.metadata || {}),
          // Store request information for audit purposes
          referer: referer,
          userAgent: event.headers['User-Agent'] || event.headers['user-agent'],
          sourceIp: event.requestContext.identity?.sourceIp || 'unknown',
        },
      };

      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: item,
        }),
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Survey response recorded',
          id: item.id,
        }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
