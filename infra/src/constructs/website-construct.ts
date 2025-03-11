import {
  Distribution,
  ViewerProtocolPolicy,
  FunctionEventType,
  CachePolicy,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CacheQueryStringBehavior,
  AllowedMethods,
  CachedMethods,
  SecurityPolicyProtocol,
  SSLMethod,
  HttpVersion,
  PriceClass,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionRuntime,
  LambdaEdgeEventType,
  OriginRequestHeaderBehavior,
  OriginRequestQueryStringBehavior,
  IFunction,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin, HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  Bucket,
  BlockPublicAccess,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { RemovalPolicy } from 'aws-cdk-lib';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { EdgeVerifyConstruct } from './edge-verify-construct';
import { WebsiteDeploymentConstruct } from './website-deployment-construct';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { LoggingConstruct } from './logging-construct';

interface WebsiteConstructProps {
  domainName: string;
  environment: 'development' | 'production';
  certificate: ICertificate;
  hostedZone: IHostedZone;
  apiKey: string;
  baseRole: IRole;
  surveyApi: RestApi;
  edgeVerifyFunction: IFunction;
}

export class WebsiteConstruct extends Construct {
  public readonly distribution: Distribution;
  public readonly siteBucket: Bucket;

  constructor(scope: Construct, id: string, props: WebsiteConstructProps) {
    super(scope, id);

    // Create WAF Web ACL with rate limiting
    const webAcl = new CfnWebACL(this, 'WebAcl', {
      defaultAction: { allow: {} },
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WebACL',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          action: { block: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
            sampledRequestsEnabled: true,
          },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
        },
      ],
    });

    // Create edge verify function as separate construct
    const edgeVerify = new EdgeVerifyConstruct(this, 'EdgeVerify', {
      domainName: props.domainName,
      apiKey: props.apiKey,
    });

    // Create S3 bucket
    this.siteBucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.siteBucket.grantReadWrite(props.baseRole);

    const pagesCachePolicy = this.createPagesCachePolicy();

    // Create security headers policy
    const responseHeadersPolicy = this.createSecurityHeadersPolicy();

    // Create logging bucket for CloudFront with minimal config
    const logBucket = new Bucket(this, 'CloudFrontLogsBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
    });

    // Grant CloudFront permissions using service principal
    logBucket.grantWrite(new ServicePrincipal('cloudfront.amazonaws.com'));

    // Set up Athena/Glue for log analysis
    new LoggingConstruct(this, 'Logging', {
      logBucket: logBucket,
      domainName: props.domainName,
      environment: props.environment,
    });

    // Create custom origin request policy
    const surveyOriginRequestPolicy = new OriginRequestPolicy(
      this,
      'SurveyOriginRequestPolicy',
      {
        headerBehavior: OriginRequestHeaderBehavior.allowList(
          'x-api-key',
          'referer',
          'Referer',
        ),
        queryStringBehavior: OriginRequestQueryStringBehavior.all(),
      },
    );

    // Create CloudFront distribution with the version reference
    this.distribution = new Distribution(this, 'Distribution', {
      webAclId: webAcl.attrArn,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: CachedMethods.CACHE_GET_HEAD,
        cachePolicy: pagesCachePolicy,
        responseHeadersPolicy,
      },
      additionalBehaviors: {
        '/survey': {
          origin: new HttpOrigin(
            `${props.surveyApi.restApiId}.execute-api.${
              Stack.of(this).region
            }.amazonaws.com`,
            {
              originPath: `/${props.surveyApi.deploymentStage.stageName}`,
            },
          ),
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: surveyOriginRequestPolicy,
          edgeLambdas: [
            {
              functionVersion: edgeVerify.version,
              eventType: LambdaEdgeEventType.VIEWER_REQUEST,
              includeBody: false,
            },
          ],
        },
      },
      certificate: props.certificate,
      domainNames: [props.domainName, `www.${props.domainName}`],
      enableIpv6: true,
      httpVersion: HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: SSLMethod.SNI,
      priceClass: PriceClass.PRICE_CLASS_100,
      comment: `CDN for ${props.domainName}`,
      defaultRootObject: 'index.html',
      enableLogging: true,
      logBucket: logBucket,
      logFilePrefix: `cloudfront-logs/`,
      logIncludesCookies: true,
    });

    // Create deployment in a separate construct
    new WebsiteDeploymentConstruct(this, 'Deployment', {
      siteBucket: this.siteBucket,
      distribution: this.distribution,
    });
  }

  private createPagesCachePolicy(): CachePolicy {
    return new CachePolicy(this, 'PagesCache', {
      minTtl: Duration.minutes(1),
      maxTtl: Duration.days(1),
      defaultTtl: Duration.hours(1),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      cookieBehavior: CacheCookieBehavior.none(),
      headerBehavior: CacheHeaderBehavior.allowList('Accept'),
      queryStringBehavior: CacheQueryStringBehavior.allowList('q', 'category'),
    });
  }

  private createSecurityHeadersPolicy(): ResponseHeadersPolicy {
    return new ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy:
            "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365 * 2),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        xssProtection: { protection: true, modeBlock: true, override: true },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=()',
            override: true,
          },
        ],
      },
    });
  }
}
