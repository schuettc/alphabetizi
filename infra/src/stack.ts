import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { randomBytes } from 'crypto';
import { ApiConstruct } from './constructs/api-construct';
import { FrontendConstruct } from './constructs/frontend-construct';
import { DnsConstruct } from './constructs/dns-construct';

export interface AlphabetizeStackProps extends StackProps {
  /**
   * Whether this is a testing environment
   * @default false
   */
  isTestEnvironment?: boolean;
}

export class AlphabetizeStack extends Stack {
  constructor(scope: Construct, id: string, props?: AlphabetizeStackProps) {
    super(scope, id, props);

    // Define domain name
    const domainName = 'alphabetizi.ng';
    const siteDomain = `app.${domainName}`;

    // Check if we're in us-east-1, which is required for CloudFront certificates
    if (this.region !== 'us-east-1') {
      throw new Error(
        'AlphabetizeStack must be deployed to the us-east-1 region because it creates an ACM certificate for CloudFront',
      );
    }

    // Generate a secure random API key
    const apiKey = randomBytes(32).toString('hex');

    // Create the API construct
    const api = new ApiConstruct(this, 'Api', {
      siteDomain,
      apiKey,
    });

    // Create the DNS construct first (for certificate)
    const dns = new DnsConstruct(this, 'Dns', {
      domainName,
      siteDomain,
      hostedZoneId: 'Z08765868CNM53X8EIIV',
    });

    // Create the frontend construct
    const frontend = new FrontendConstruct(this, 'Frontend', {
      domainName,
      siteDomain,
      certificate: dns.certificate,
      apiKey,
      apiUrl: api.api.url,
    });

    // Create DNS records now that we have the distribution
    dns.createRecords(frontend.distribution);

    // Output the site URL, CloudFront URL and API URL
    new CfnOutput(this, 'SiteURL', {
      value: `https://${siteDomain}`,
      description: 'The URL of the website',
    });

    new CfnOutput(this, 'CloudFrontURL', {
      value: `https://${frontend.distribution.distributionDomainName}`,
      description: 'The URL of the CloudFront distribution',
    });

    new CfnOutput(this, 'ApiURL', {
      value: api.api.url,
      description: 'The URL of the API Gateway',
    });

    new CfnOutput(this, 'ApiKey', {
      value: apiKey,
      description:
        'The API key for accessing the API Gateway (keep this secret)',
    });
  }
}
