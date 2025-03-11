import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import {
  OpenIdConnectProvider,
  Role,
  WebIdentityPrincipal,
  PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class OidcStack extends Stack {
  public readonly githubProvider: OpenIdConnectProvider;
  public readonly baseRole: Role;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.githubProvider = new OpenIdConnectProvider(this, 'GithubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // Create base role for GitHub Actions
    this.baseRole = new Role(this, 'GitHubActionsBaseRole', {
      roleName: 'github-actions-alphabetizi-base',
      assumedBy: new WebIdentityPrincipal(
        this.githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': [
              'repo:schuettc/alphabetizi:*',
              'repo:schuettc/alphabetizi:ref:refs/heads/main',
              'repo:schuettc/alphabetizi:ref:refs/heads/develop',
              'repo:schuettc/alphabetizi:pull_request',
            ],
          },
        },
      ),
    });

    // Add base permissions that apply to all environments
    this.baseRole.addToPolicy(
      new PolicyStatement({
        actions: [
          's3:PutObject',
          's3:GetObject',
          's3:ListBucket',
          's3:DeleteObject',
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
          'route53:GetHostedZone',
          'route53:ChangeResourceRecordSets',
          'route53:ListResourceRecordSets',
          'ssm:GetParameter',
          'sts:AssumeRole',
          'cloudformation:DescribeStacks',
          'cloudformation:GetTemplate',
          'cloudformation:ListStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:CreateStack',
          'cloudformation:UpdateStack',
          'cloudformation:DeleteStack',
          'cloudformation:ListStackResources',
          'cloudformation:DescribeStackResource',
          'cloudformation:DescribeStackResources',
          'secretsmanager:GetSecretValue',
          'secretsmanager:UpdateSecret',
          'secretsmanager:CreateSecret',
        ],
        resources: ['*'],
      }),
    );

    // Add specific permission for CDK bootstrap version check
    this.baseRole.addToPolicy(
      new PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:aws:ssm:${Stack.of(this).region}:${
            Stack.of(this).account
          }:parameter/cdk-bootstrap/*`,
        ],
      }),
    );

    // Export the provider ARN and role ARN as stack outputs
    new CfnOutput(this, 'GithubProviderArn', {
      value: this.githubProvider.openIdConnectProviderArn,
      exportName: 'GithubProviderArn',
    });

    new CfnOutput(this, 'GitHubActionsBaseRoleArn', {
      value: this.baseRole.roleArn,
      exportName: 'GitHubActionsBaseRoleArn',
    });
  }
}
