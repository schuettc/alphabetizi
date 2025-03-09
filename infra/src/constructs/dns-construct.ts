import { Construct } from 'constructs';
import {
  HostedZone,
  ARecord,
  RecordTarget,
  AaaaRecord,
  IHostedZone,
} from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';

export interface DnsConstructProps {
  /**
   * The domain name for the site
   */
  domainName: string;

  /**
   * The subdomain for the site (e.g., app.domain.com)
   */
  siteDomain: string;

  /**
   * The hosted zone ID
   */
  hostedZoneId: string;
}

export class DnsConstruct extends Construct {
  public readonly certificate: Certificate;
  public readonly hostedZone: IHostedZone;
  private readonly domainName: string;
  private readonly siteDomain: string;

  constructor(scope: Construct, id: string, props: DnsConstructProps) {
    super(scope, id);

    this.domainName = props.domainName;
    this.siteDomain = props.siteDomain;

    // Import existing hosted zone
    this.hostedZone = HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      zoneName: this.domainName,
      hostedZoneId: props.hostedZoneId,
    });

    // Create the certificate with DNS validation
    this.certificate = new Certificate(this, 'SiteCertificate', {
      domainName: this.domainName,
      subjectAlternativeNames: [`www.${this.domainName}`, this.siteDomain],
      validation: CertificateValidation.fromDns(this.hostedZone),
    });
  }

  /**
   * Create DNS records for the CloudFront distribution
   */
  public createRecords(distribution: Distribution): void {
    // Create Route53 records for the CloudFront distribution
    new ARecord(this, 'SiteAliasRecord', {
      zone: this.hostedZone,
      recordName: this.siteDomain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new AaaaRecord(this, 'SiteAliasRecordIPv6', {
      zone: this.hostedZone,
      recordName: this.siteDomain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    // Add records for base domain
    new ARecord(this, 'BaseAliasRecord', {
      zone: this.hostedZone,
      recordName: this.domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new AaaaRecord(this, 'BaseAliasRecordIPv6', {
      zone: this.hostedZone,
      recordName: this.domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    // Add records for www subdomain
    new ARecord(this, 'WwwAliasRecord', {
      zone: this.hostedZone,
      recordName: `www.${this.domainName}`,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new AaaaRecord(this, 'WwwAliasRecordIPv6', {
      zone: this.hostedZone,
      recordName: `www.${this.domainName}`,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
  }
}
