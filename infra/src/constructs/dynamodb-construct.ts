import { Construct } from 'constructs';
import {
  Table,
  BillingMode,
  AttributeType,
  ProjectionType,
} from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export class SurveyTable extends Construct {
  public readonly table: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create the DynamoDB table
    this.table = new Table(this, 'RecordOrganizationSurvey', {
      partitionKey: { name: 'questionId', type: AttributeType.STRING },
      sortKey: { name: 'response', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Add a counter GSI to allow for easy aggregation of results
    this.table.addGlobalSecondaryIndex({
      indexName: 'QuestionIndex',
      partitionKey: { name: 'questionId', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
  }
}
