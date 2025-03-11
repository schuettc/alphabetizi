import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role } from 'aws-cdk-lib/aws-iam';
import { WebsiteConstruct } from '../constructs/website-construct';
import { DnsConstruct } from '../constructs/dns-construct';
import { ApiConstruct } from '../constructs/api-construct';
import { SurveyTable } from '../constructs/dynamodb-construct';
import { EdgeVerifyConstruct } from '../constructs/edge-verify-construct';

interface AlphabetizeStackProps extends StackProps {
  domainName: string;
  environment: 'development' | 'production';
}

export class AlphabetizeStack extends Stack {
  constructor(scope: Construct, id: string, props: AlphabetizeStackProps) {
    super(scope, id, props);

    // Import the base role from OIDC stack
    const baseRole = Role.fromRoleArn(
      this,
      'BaseRole',
      `arn:aws:iam::${
        Stack.of(this).account
      }:role/github-actions-alphabetizi-base`,
    );

    const surveyTable = new SurveyTable(this, 'SurveyTable');

    const survey = new ApiConstruct(this, 'Survey', {
      domainName: props.domainName,
      surveyTable: surveyTable.table,
    });

    // Get the generated API key
    const apiKey = survey.getApiKey();

    // Create edge function to inject API key
    const edgeFunction = new EdgeVerifyConstruct(this, 'EdgeVerify', {
      domainName: props.domainName,
      apiKey: apiKey,
    }).function;

    // Create DNS infrastructure
    const dnsConstruct = new DnsConstruct(this, 'DNS', {
      domainName: props.domainName,
    });

    // Create site hosting infrastructure (now includes API and edge functions)
    const website = new WebsiteConstruct(this, 'Site', {
      domainName: props.domainName,
      environment: props.environment,
      certificate: dnsConstruct.certificate,
      hostedZone: dnsConstruct.hostedZone,
      apiKey: apiKey,
      baseRole: baseRole,
      surveyApi: survey.api,
      edgeVerifyFunction: edgeFunction,
    });

    dnsConstruct.addDistribution(website.distribution, props.domainName);

    // Outputs
    new CfnOutput(this, 'SiteURL', {
      value: `https://${props.domainName}`,
    });

    new CfnOutput(this, 'CloudFrontURL', {
      value: website.distribution.distributionDomainName,
    });
  }
}
