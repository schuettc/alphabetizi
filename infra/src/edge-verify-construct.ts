import { Construct } from 'constructs';
import { join } from 'path';
import { Version } from 'aws-cdk-lib/aws-lambda';
import { Runtime, Code, Function } from 'aws-cdk-lib/aws-lambda';
import {
  Role,
  ServicePrincipal,
  CompositePrincipal,
  ManagedPolicy,
} from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';

/**
 * Properties for the EdgeVerifyConstruct
 */
export interface EdgeVerifyConstructProps {
  /**
   * Domain name of the site
   * Note: For initial deployment, this will be a placeholder.
   * After deployment, you'll need to update the Lambda@Edge function
   * with the actual CloudFront domain.
   */
  siteDomain: string;

  /**
   * API key to inject into requests
   */
  apiKey: string;
}

/**
 * A construct that creates a Lambda@Edge function for request verification.
 * This function validates that API requests are coming from your website by checking
 * the Referer header, preventing direct access from tools like curl or Postman.
 *
 * IMPORTANT: Due to CloudFront's circular dependency limitations, this construct initially
 * uses a placeholder domain. After deployment, you'll need to update the Lambda@Edge function
 * with the actual CloudFront domain name. See the postDeploymentUpdate method.
 */
export class EdgeVerifyConstruct extends Construct {
  /**
   * The Lambda function that will validate requests at the edge
   */
  public readonly function: Function;

  /**
   * The function version that will be attached to CloudFront
   */
  public readonly version: Version;

  constructor(scope: Construct, id: string, props: EdgeVerifyConstructProps) {
    super(scope, id);

    // Create a role for the Lambda@Edge function
    // Lambda@Edge requires permissions for both lambda and edgelambda
    const role = new Role(this, 'EdgeVerifyRole', {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('lambda.amazonaws.com'),
        new ServicePrincipal('edgelambda.amazonaws.com'),
      ),
    });

    // Add the basic execution role permission
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole',
      ),
    );

    // Read the function code and replace the placeholders
    const edgeFunctionPath = join(__dirname, '../lambda/edge-verify/index.ts');
    let functionCode = fs.readFileSync(edgeFunctionPath, 'utf8');

    // Replace placeholders with actual values
    // Note: In initial deployment, siteDomain will be a placeholder value
    functionCode = functionCode
      .replace('__SITE_DOMAIN__', props.siteDomain)
      .replace('__API_KEY__', props.apiKey);

    // Write the modified code to a temporary file
    const tempFilePath = join(
      __dirname,
      '../lambda/edge-verify/index.modified.ts',
    );
    fs.writeFileSync(tempFilePath, functionCode);

    // Create the Lambda function
    // Lambda@Edge functions must be created in us-east-1
    this.function = new Function(this, 'Function', {
      runtime: Runtime.NODEJS_18_X, // Lambda@Edge supports up to Node.js 18
      handler: 'index.handler',
      code: Code.fromAsset(join(__dirname, '../lambda/edge-verify')),
      role: role,
      description: 'Edge verification function for securing API requests',
      // Lambda@Edge functions cannot use environment variables,
      // so we've injected the values directly into the code
    });

    // Create a version for the function
    // CloudFront requires a specific version, not $LATEST
    this.version = new Version(this, 'CurrentVersion', {
      lambda: this.function,
      description: `Edge verification function for ${props.siteDomain}`,
    });

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);
  }

  /**
   * After deployment, you need to update the Lambda@Edge function with the actual CloudFront domain.
   * This isn't part of the CDK deployment due to circular dependency issues, but should be
   * performed after initial deployment as a separate step.
   *
   * Example AWS CLI command to update the function code:
   * ```
   * aws lambda update-function-code --function-name <function-name> \
   *   --zip-file fileb://<path-to-updated-code> \
   *   --region us-east-1
   * ```
   *
   * Then publish a new version and update the CloudFront distribution to use this new version.
   */
  public static postDeploymentUpdate(
    functionName: string,
    actualDomain: string,
    apiKey: string,
  ): void {
    // This is a static helper method documenting the post-deployment update process
    // You would use this information in a separate script or manual steps
    console.log(`
    IMPORTANT: After deployment, update the Lambda@Edge function with the actual CloudFront domain:
    
    1. Update the Lambda function code by replacing __SITE_DOMAIN__ with ${actualDomain}
    2. Publish a new version of the Lambda function
    3. Update the CloudFront distribution to use the new version
    
    This can't be done during initial deployment due to circular dependency issues.
    `);
  }
}
