#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { AlphabetizeStack } from './stack';

const app = new App();

// Create a single stack for everything including the certificate
new AlphabetizeStack(app, 'AlphabetizeStack', {
  env: { region: 'us-east-1' },
  description: 'Infrastructure for the Alphabetize Survey Application',
});

app.synth();
