import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { RemovalPolicy, DockerImage } from 'aws-cdk-lib';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface SiteProps {
  /**
   * The API URL to be included in the config.json file
   */
  apiUrl: string;

  /**
   * The site domain (e.g., app.cataloging.music)
   */
  siteDomain: string;

  /**
   * The S3 bucket to deploy the website to
   */
  bucket: Bucket;

  /**
   * The CloudFront distribution
   */
  distribution: Distribution;
}

/**
 * Construct to build and deploy the frontend site
 */
export class Site extends Construct {
  constructor(scope: Construct, id: string, props: SiteProps) {
    super(scope, id);

    // Create a config.json file for the frontend with the API URL
    const config = {
      apiUrl: props.apiUrl,
      siteUrl: `https://${props.siteDomain}`,
    };

    // Build the site using CDK's bundling feature
    const sitePath = path.resolve(__dirname, '../../site');

    // Use Source.asset with bundling for building the frontend
    const siteBundle = Source.asset(sitePath, {
      bundling: {
        image: DockerImage.fromRegistry('node:18'),
        command: [
          'bash',
          '-c',
          'echo "Docker bundling not available. Please ensure pnpm is installed."',
        ],
        // Local fallback that will build the site using the local pnpm installation
        local: {
          tryBundle(outputDir: string) {
            try {
              // Check if pnpm is installed
              execSync('pnpm --version', { stdio: 'ignore' });

              console.log('Building frontend with pnpm...');

              // Execute the build
              execSync('cd ../site && pnpm install && pnpm run build', {
                stdio: 'inherit',
              });

              // Copy the built assets to the output directory
              fs.copySync(path.join(sitePath, 'dist'), outputDir, {
                overwrite: true,
                errorOnExist: false,
              });

              return true;
            } catch (error) {
              console.error('Error building the frontend:', error);
              return false;
            }
          },
        },
      },
    });

    // Deploy the built site and config.json to the S3 bucket
    new BucketDeployment(this, 'DeployWebsite', {
      sources: [siteBundle, Source.jsonData('config.json', config)],
      destinationBucket: props.bucket,
      distribution: props.distribution,
      distributionPaths: ['/*'],
    });
  }
}
