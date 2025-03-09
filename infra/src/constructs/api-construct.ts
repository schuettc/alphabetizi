import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import {
  RestApi,
  LambdaIntegration,
  ApiKey,
  UsagePlan,
  ApiKeySourceType,
  Period,
} from 'aws-cdk-lib/aws-apigateway';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';

export interface ApiConstructProps {
  /**
   * The domain name for CORS configuration
   */
  siteDomain: string;

  /**
   * The API key to use for authentication
   */
  apiKey: string;
}

export class ApiConstruct extends Construct {
  public readonly api: RestApi;
  public readonly apiKey: string;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    // DynamoDB table for storing alphabetization responses
    const surveyTable = new Table(this, 'AlphabetizeSurveyTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // Use RETAIN in production
    });

    // Lambda function for API backend
    const apiHandler = new Function(this, 'ApiHandler', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(join(__dirname, '../../lambda')),
      environment: {
        TABLE_NAME: surveyTable.tableName,
      },
    });

    // Grant the Lambda function permissions to access the DynamoDB table
    surveyTable.grantReadWriteData(apiHandler);

    // API Gateway RESTful API with API key requirement
    this.api = new RestApi(this, 'AlphabetizeApi', {
      restApiName: 'Alphabetize Record Survey API',
      description: 'API for submitting record alphabetization survey responses',
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${props.siteDomain}`],
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
      },
      apiKeySourceType: ApiKeySourceType.HEADER,
    });

    // Create API key
    const surveyApiKey = new ApiKey(this, 'SurveyApiKey', {
      description: 'API key for the alphabetization survey API',
      value: props.apiKey,
    });

    // Create a usage plan for the API key
    const usagePlan = new UsagePlan(this, 'SurveyUsagePlan', {
      name: 'StandardPlan',
      description: 'Standard usage plan for survey API',
      apiStages: [
        {
          api: this.api,
          stage: this.api.deploymentStage,
        },
      ],
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
      quota: {
        limit: 1000,
        period: Period.DAY,
      },
    });

    // Associate the API key with the usage plan
    usagePlan.addApiKey(surveyApiKey);

    // Add resources and methods to the API
    const surveysResource = this.api.root.addResource('surveys');
    surveysResource.addMethod('POST', new LambdaIntegration(apiHandler), {
      apiKeyRequired: true,
    });

    this.apiKey = props.apiKey;
  }
}
