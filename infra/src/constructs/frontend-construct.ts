import { Construct } from 'constructs';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import {
  Distribution,
  ViewerProtocolPolicy,
  CachePolicy,
  LambdaEdgeEventType,
  SecurityPolicyProtocol,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { EdgeVerifyConstruct } from '../edge-verify-construct';
import { Site } from '../site-construct';

export interface FrontendConstructProps {
  /**
   * The domain name for the site
   */
  domainName: string;

  /**
   * The subdomain for the site (e.g., app.domain.com)
   */
  siteDomain: string;

  /**
   * The certificate to use for HTTPS
   */
  certificate: Certificate;

  /**
   * The API key to inject via Lambda@Edge
   */
  apiKey: string;

  /**
   * The API URL for the backend
   */
  apiUrl: string;
}

export class FrontendConstruct extends Construct {
  public readonly distribution: Distribution;
  public readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props: FrontendConstructProps) {
    super(scope, id);

    // S3 bucket for website hosting
    this.bucket = new Bucket(this, 'SiteBucket', {
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create WAF Web ACL for CloudFront
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
              limit: 100,
              aggregateKeyType: 'IP',
            },
          },
        },
      ],
    });

    // Create a Lambda@Edge function for request validation
    const edgeVerify = new EdgeVerifyConstruct(this, 'EdgeVerify', {
      siteDomain: props.siteDomain,
      apiKey: props.apiKey,
    });

    // CloudFront distribution
    this.distribution = new Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/surveys/*': {
          origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          edgeLambdas: [
            {
              functionVersion: edgeVerify.version,
              eventType: LambdaEdgeEventType.VIEWER_REQUEST,
              includeBody: false,
            },
          ],
        },
        '/assets/*': {
          origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        },
      },
      domainNames: [
        props.siteDomain,
        props.domainName,
        `www.${props.domainName}`,
      ],
      certificate: props.certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(0),
        },
      ],
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      webAclId: webAcl.attrArn,
    });

    // Deploy the frontend site
    new Site(this, 'WebsiteDeploy', {
      apiUrl: props.apiUrl,
      siteDomain: props.siteDomain,
      bucket: this.bucket,
      distribution: this.distribution,
    });
  }
}
