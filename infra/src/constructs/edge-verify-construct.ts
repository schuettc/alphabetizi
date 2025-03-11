import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, Version } from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';
import { Construct } from 'constructs';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { CompositePrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';

interface EdgeVerifyProps {
  domainName: string;
  apiKey: string;
}

export class EdgeVerifyConstruct extends Construct {
  public readonly function: NodejsFunction;
  public readonly version: Version;

  constructor(scope: Construct, id: string, props: EdgeVerifyProps) {
    super(scope, id);

    // Create role for Lambda@Edge
    const role = new Role(this, 'EdgeVerifyRole', {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('lambda.amazonaws.com'),
        new ServicePrincipal('edgelambda.amazonaws.com'),
      ),
    });

    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole',
      ),
    );

    // Create Lambda@Edge function
    this.function = new NodejsFunction(this, 'Function', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      role: role,
      entry: join(__dirname, '../lambdas/edge-verify/index.ts'),
      bundling: {
        define: {
          'process.env.DOMAIN_NAME': JSON.stringify(props.domainName),
          'process.env.API_KEY': JSON.stringify(props.apiKey),
        },
      },
      architecture: Architecture.X86_64,
    });

    // Create Version explicitly
    this.version = this.function.currentVersion;
  }
}
