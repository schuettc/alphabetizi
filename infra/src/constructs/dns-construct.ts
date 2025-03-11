import { Construct } from 'constructs';
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';
import {
  HostedZone,
  ARecord,
  RecordTarget,
  IHostedZone,
} from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';

interface DnsConstructProps {
  domainName: string;
}

export class DnsConstruct extends Construct {
  public readonly certificate: Certificate;
  public readonly hostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props: DnsConstructProps) {
    super(scope, id);

    // Get the root domain from the subdomain
    const rootDomain = props.domainName.split('.').slice(-2).join('.');

    // Look up the parent hosted zone
    this.hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: rootDomain, // Use the root domain for lookup
    });

    // Create certificate for the full domain (including subdomain)
    this.certificate = new Certificate(this, 'Certificate', {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: CertificateValidation.fromDns(this.hostedZone),
    });
  }

  public addDistribution(distribution: Distribution, domainName: string): void {
    // Create A record for apex domain
    new ARecord(this, 'ApexRecord', {
      zone: this.hostedZone,
      recordName: domainName, // This will create the subdomain record
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    // Create A record for www subdomain
    new ARecord(this, 'WwwRecord', {
      zone: this.hostedZone,
      recordName: `www.${domainName}`,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
  }
}
