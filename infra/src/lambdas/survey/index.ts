import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME;

// Get origin from request or default to allowed origins
function getAllowedOrigin(event: APIGatewayProxyEvent): string {
  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigins = [
    'https://alphabetizi.ng',
    'https://www.alphabetizi.ng',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  return allowedOrigins.includes(origin as string)
    ? (origin as string)
    : allowedOrigins[0];
}

// Interfaces for our data models
interface SurveyResponse {
  questionId: string;
  selectedOption: string;
}

interface SurveyResults {
  [questionId: string]: {
    [optionId: string]: number;
    total: number;
  };
}

/**
 * Records a survey response in DynamoDB
 */
async function recordResponse(response: SurveyResponse): Promise<void> {
  if (!TABLE_NAME) {
    console.error('TABLE_NAME environment variable not set');
    throw new Error('TABLE_NAME environment variable not set');
  }

  try {
    console.log(
      `Recording response to table ${TABLE_NAME}:`,
      JSON.stringify(response),
    );

    // Update the count for this question/response combination
    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        questionId: response.questionId,
        response: response.selectedOption,
      },
      UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc',
      ExpressionAttributeNames: {
        '#count': 'count',
      },
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1,
      },
      ReturnValues: 'UPDATED_NEW' as const,
    };

    console.log('Update parameters:', JSON.stringify(updateParams, null, 2));

    const result = await docClient.send(new UpdateCommand(updateParams));

    console.log('Update result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error recording response:', error);
    throw error;
  }
}

/**
 * Retrieves survey results from DynamoDB
 * @param questionId Optional - If provided, only retrieves results for the specified question
 */
async function getSurveyResults(questionId?: string): Promise<SurveyResults> {
  if (!TABLE_NAME) {
    console.error('TABLE_NAME environment variable not set');
    throw new Error('TABLE_NAME environment variable not set');
  }

  try {
    const results: SurveyResults = {};

    // If questionId is provided, use Query operation with the GSI
    if (questionId) {
      console.log(
        `Querying table: ${TABLE_NAME} for results of question: ${questionId}`,
      );

      const queryResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'QuestionIndex',
          KeyConditionExpression: 'questionId = :qid',
          ExpressionAttributeValues: {
            ':qid': questionId,
          },
        }),
      );

      console.log(
        `Query returned ${
          queryResult.Items?.length || 0
        } items for questionId: ${questionId}`,
      );

      // Process the results for this specific question
      if (queryResult.Items && queryResult.Items.length > 0) {
        results[questionId] = { total: 0 };

        queryResult.Items.forEach((item) => {
          const { response, count } = item;
          results[questionId][response] = count;
          results[questionId].total += count;
        });
      }
    }
    // If no questionId provided, use Scan to get all results (less efficient)
    else {
      console.log(`Scanning table: ${TABLE_NAME} for all survey results`);

      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
        }),
      );

      console.log(`Scan returned ${scanResult.Items?.length || 0} items`);

      // Process all results into the results object
      scanResult.Items?.forEach((item) => {
        const { questionId, response, count } = item;

        if (!results[questionId]) {
          results[questionId] = { total: 0 };
        }

        results[questionId][response] = count;
        results[questionId].total += count;
      });
    }

    console.log(
      `Processed results for ${Object.keys(results).length} unique questions`,
    );
    return results;
  } catch (error) {
    console.error('Error getting survey results:', error);
    throw error;
  }
}

/**
 * Lambda handler for survey endpoints
 */
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log('Request event:', JSON.stringify(event, null, 2));

  const origin = getAllowedOrigin(event);
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // GET request - return survey results
    if (event.httpMethod === 'GET') {
      console.log('Processing GET request for survey results');

      // Check if a specific questionId was requested via query parameters
      const questionId = event.queryStringParameters?.questionId;
      if (questionId) {
        console.log(`Request for specific question: ${questionId}`);
      } else {
        console.log('Request for all survey results');
      }

      const results = await getSurveyResults(questionId);
      console.log(
        'Retrieved survey results:',
        JSON.stringify(results, null, 2),
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(results),
      };
    }

    // POST request - record a new response
    if (event.httpMethod === 'POST' && event.body) {
      console.log('Processing POST request with body:', event.body);
      const response = JSON.parse(event.body) as SurveyResponse;

      // Basic validation
      if (!response.questionId || !response.selectedOption) {
        console.warn('Missing required fields in request');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error:
              'Missing required fields: questionId and selectedOption are required',
          }),
        };
      }

      console.log('Recording response:', JSON.stringify(response, null, 2));
      await recordResponse(response);
      console.log('Response recorded successfully');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    // Unsupported method
    console.warn(`Unsupported HTTP method: ${event.httpMethod}`);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
