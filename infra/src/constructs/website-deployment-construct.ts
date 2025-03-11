import { Construct } from 'constructs';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import * as path from 'path';

interface WebsiteDeploymentConstructProps {
  siteBucket: IBucket;
  distribution: IDistribution;
}

export class WebsiteDeploymentConstruct extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: WebsiteDeploymentConstructProps,
  ) {
    super(scope, id);

    new BucketDeployment(this, 'DeployWithInvalidation', {
      sources: [Source.asset(path.join(__dirname, '../../../site/dist'))],
      destinationBucket: props.siteBucket,
      distribution: props.distribution,
      distributionPaths: ['/*'],
    });
  }
}
