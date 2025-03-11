#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { AlphabetizeStack } from './stacks/alphabetize-stack';
import { OidcStack } from './stacks/oidc-stack';

const app = new App();

// Create the OIDC stack first
new OidcStack(app, 'AlphabetizeOidcStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
});

// Get environment name from DOMAIN_NAME
const environment = process.env.DOMAIN_NAME?.includes('dev')
  ? 'development'
  : 'production';

// Create blog stack (now imports OIDC provider via CloudFormation export)
new AlphabetizeStack(app, `AlphabetizeStack-${environment}`, {
  domainName: process.env.DOMAIN_NAME || 'alphabetizi.ng',
  environment: environment,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
});

app.synth();
