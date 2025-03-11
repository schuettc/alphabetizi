import {
  RestApi,
  LambdaIntegration,
  AuthorizationType,
  RequestAuthorizer,
  IdentitySource,
  LogGroupLogDestination,
  AccessLogFormat,
  MethodLoggingLevel,
} from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';
import { Duration } from 'aws-cdk-lib';
import { randomBytes } from 'crypto';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

interface ApiConstructProps {
  domainName: string;
  surveyTable: Table;
}

export class ApiConstruct extends Construct {
  public readonly api: RestApi;
  private readonly apiKey: string;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    // Generate a secure API key
    this.apiKey = randomBytes(32).toString('hex');

    // Create log group for API Gateway
    const logGroup = new LogGroup(this, 'ApiLogs', {
      retention: RetentionDays.ONE_WEEK,
    });

    // Create authorizer function
    const authorizerFunction = new NodejsFunction(this, 'AuthorizerFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: join(__dirname, '../lambdas/authorizer/index.ts'),
      environment: {
        API_KEY: this.apiKey,
        DOMAIN_NAME: props.domainName,
      },
    });

    // Create authorizer
    const authorizer = new RequestAuthorizer(this, 'SurveyAuthorizer', {
      handler: authorizerFunction,
      identitySources: [IdentitySource.header('x-api-key')],
      resultsCacheTtl: Duration.seconds(0),
    });

    const surveyFunction = new NodejsFunction(this, 'SurveyFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      timeout: Duration.seconds(30),
      entry: join(__dirname, '../lambdas/survey/index.ts'),
      environment: {
        TABLE_NAME: props.surveyTable.tableName,
      },
    });

    props.surveyTable.grantReadWriteData(surveyFunction);

    // Create API Gateway with logging
    this.api = new RestApi(this, 'SurveyApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${props.domainName}`],
        allowMethods: ['GET', 'POST'],
        allowHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
      },
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(logGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
        loggingLevel: MethodLoggingLevel.INFO,
        metricsEnabled: true,
        tracingEnabled: true,
      },
    });

    const survey = this.api.root.addResource('survey');
    survey.addMethod('POST', new LambdaIntegration(surveyFunction), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
      apiKeyRequired: false,
    });

    // Add GET method to retrieve survey results
    survey.addMethod('GET', new LambdaIntegration(surveyFunction), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
      apiKeyRequired: false,
    });
  }

  public getApiKey(): string {
    return this.apiKey;
  }
}
