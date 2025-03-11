import { Construct } from "constructs";
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import { RemovalPolicy, Duration, Stack } from "aws-cdk-lib";
import { CfnDatabase, CfnTable } from "aws-cdk-lib/aws-glue";
import { CfnWorkGroup, CfnNamedQuery } from "aws-cdk-lib/aws-athena";

interface LoggingConstructProps {
  logBucket: IBucket;
  domainName: string;
  environment: "development" | "production";
}

export class LoggingConstruct extends Construct {
  public readonly athenaResultsBucket: Bucket;

  constructor(scope: Construct, id: string, props: LoggingConstructProps) {
    super(scope, id);

    // Create unique names for resources
    const resourcePrefix = `cloudfront-logs-${props.environment}-${props.domainName.replace(/\./g, "_")}`;

    // Create Athena results bucket
    this.athenaResultsBucket = new Bucket(this, "AthenaResultsBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          expiration: Duration.days(7), // Keep query results for 7 days
        },
      ],
    });

    // Create Glue Database with environment-specific name
    const database = new CfnDatabase(this, "CloudFrontLogsDatabase", {
      catalogId: Stack.of(this).account,
      databaseInput: {
        name: resourcePrefix,
        description: `CloudFront logs database for ${props.environment} ${props.domainName}`,
      },
    });

    // Create Glue Table with environment-specific name
    new CfnTable(this, "CloudFrontLogsTable", {
      catalogId: Stack.of(this).account,
      databaseName: database.ref,
      tableInput: {
        name: "cloudfront_logs",
        description: `CloudFront logs for ${props.environment} ${props.domainName}`,
        tableType: "EXTERNAL_TABLE",
        parameters: {
          "skip.header.line.count": "2",
        },
        storageDescriptor: {
          location: `s3://${props.logBucket.bucketName}/cloudfront-logs/`,
          inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
          outputFormat:
            "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
          serdeInfo: {
            serializationLibrary:
              "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe",
            parameters: {
              "field.delim": "\t",
              "serialization.format": "\t",
              "timestamp.formats": "yyyy-MM-dd HH:mm:ss",
              "ignore.malformed.fields": "true",
            },
          },
          columns: [
            { name: "date", type: "date" },
            { name: "time", type: "string" },
            { name: "location", type: "string" },
            { name: "bytes", type: "bigint" },
            { name: "request_ip", type: "string" },
            { name: "method", type: "string" },
            { name: "host", type: "string" },
            { name: "uri", type: "string" },
            { name: "status", type: "int" },
            { name: "referrer", type: "string" },
            { name: "user_agent", type: "string" },
            { name: "query_string", type: "string" },
            { name: "cookie", type: "string" },
            { name: "result_type", type: "string" },
            { name: "request_id", type: "string" },
            { name: "host_header", type: "string" },
            { name: "request_protocol", type: "string" },
            { name: "request_bytes", type: "bigint" },
            { name: "time_taken", type: "float" },
            { name: "xforwarded_for", type: "string" },
            { name: "ssl_protocol", type: "string" },
            { name: "ssl_cipher", type: "string" },
            { name: "response_result_type", type: "string" },
            { name: "http_version", type: "string" },
            { name: "fle_status", type: "string" },
            { name: "fle_encrypted_fields", type: "int" },
            { name: "c_port", type: "int" },
            { name: "time_to_first_byte", type: "float" },
            { name: "x_edge_detailed_result_type", type: "string" },
            { name: "sc_content_type", type: "string" },
            { name: "sc_content_len", type: "bigint" },
            { name: "sc_range_start", type: "bigint" },
            { name: "sc_range_end", type: "bigint" },
          ],
        },
      },
    });

    // Create Athena Workgroup with environment-specific name
    const workgroup = new CfnWorkGroup(this, "CloudFrontLogsWorkgroup", {
      name: resourcePrefix,
      description: `Workgroup for analyzing CloudFront logs for ${props.environment} ${props.domainName}`,
      recursiveDeleteOption: true,
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${this.athenaResultsBucket.bucketName}/`,
        },
        publishCloudWatchMetricsEnabled: true,
        enforceWorkGroupConfiguration: true,
        engineVersion: {
          selectedEngineVersion: "Athena engine version 3",
        },
      },
    });

    // Update queries to include environment in names
    const queries = [
      {
        name: `Top Pages - ${props.environment}`,
        description: `Shows most visited pages excluding assets for ${props.environment}`,
        query: `
          SELECT 
              uri,
              COUNT(*) as hits,
              date as access_date
          FROM cloudfront_logs
          WHERE date >= CURRENT_DATE - INTERVAL '7' DAY
              AND uri NOT LIKE '%._next/%'
              AND uri NOT LIKE '%.ico'
              AND uri NOT LIKE '%.png'
              AND uri NOT LIKE '%.jpg'
              AND uri NOT LIKE '%.js'
              AND uri NOT LIKE '%.css'
          GROUP BY uri, date
          ORDER BY hits DESC
          LIMIT 100;`,
      },
      {
        name: `Traffic by Hour - ${props.environment}`,
        description: `Shows traffic patterns by hour for ${props.environment}`,
        query: `
          SELECT 
              HOUR(PARSE_DATETIME(time, 'HH:mm:ss')) as hour_utc,
              COUNT(*) as requests,
              AVG(time_taken) as avg_response_time
          FROM cloudfront_logs
          WHERE date >= CURRENT_DATE - INTERVAL '7' DAY
          GROUP BY HOUR(PARSE_DATETIME(time, 'HH:mm:ss'))
          ORDER BY hour_utc;`,
      },
      {
        name: `Error Analysis - ${props.environment}`,
        description: `Shows pages with errors for ${props.environment}`,
        query: `
          SELECT 
              status,
              uri,
              COUNT(*) as error_count
          FROM cloudfront_logs
          WHERE date >= CURRENT_DATE - INTERVAL '7' DAY
              AND status >= 400
          GROUP BY status, uri
          ORDER BY error_count DESC
          LIMIT 20;`,
      },
      {
        name: `Blog Performance - ${props.environment}`,
        description: `Shows performance metrics for blog posts for ${props.environment}`,
        query: `
          SELECT 
              uri,
              COUNT(*) as views,
              COUNT(DISTINCT request_ip) as unique_visitors,
              AVG(time_taken) as avg_time_taken
          FROM cloudfront_logs
          WHERE date >= CURRENT_DATE - INTERVAL '7' DAY
              AND uri LIKE '/blog/%'
              AND uri NOT LIKE '%.txt'
              AND uri NOT LIKE '%._next/%'
              AND uri NOT LIKE '%.png'
              AND uri NOT LIKE '%.jpg'
              AND uri NOT LIKE '%.ico'
              AND uri NOT LIKE '%.js'
              AND uri NOT LIKE '%.css'
              AND uri NOT LIKE '%.woff2'
              AND uri NOT LIKE '%.json'
              AND uri NOT LIKE '%.xml'
          GROUP BY uri
          HAVING COUNT(*) > 1  -- Optional: filter out single hits
          ORDER BY views DESC;`,
      },
      {
        name: `Device Analysis - ${props.environment}`,
        description: `Shows traffic by device type for ${props.environment}`,
        query: `
          SELECT 
              CASE 
                  WHEN LOWER(user_agent) LIKE '%mobile%' OR LOWER(user_agent) LIKE '%android%' OR LOWER(user_agent) LIKE '%iphone%' THEN 'Mobile'
                  WHEN LOWER(user_agent) LIKE '%tablet%' OR LOWER(user_agent) LIKE '%ipad%' THEN 'Tablet'
                  ELSE 'Desktop'
              END as device_type,
              COUNT(*) as requests,
              COUNT(DISTINCT request_ip) as unique_visitors
          FROM cloudfront_logs
          WHERE date >= CURRENT_DATE - INTERVAL '7' DAY
          GROUP BY CASE 
              WHEN LOWER(user_agent) LIKE '%mobile%' OR LOWER(user_agent) LIKE '%android%' OR LOWER(user_agent) LIKE '%iphone%' THEN 'Mobile'
              WHEN LOWER(user_agent) LIKE '%tablet%' OR LOWER(user_agent) LIKE '%ipad%' THEN 'Tablet'
              ELSE 'Desktop'
          END;`,
      },
      // Add a simple test query
      {
        name: `Test Query - ${props.environment}`,
        description: `Simple test query to verify table setup`,
        query: `
          SELECT *
          FROM cloudfront_logs
          WHERE date = CURRENT_DATE
          LIMIT 10;`,
      },
    ];

    // Create each named query in the workgroup with explicit dependency
    queries.forEach((queryDef, index) => {
      const namedQuery = new CfnNamedQuery(this, `SavedQuery${index}`, {
        database: database.ref,
        description: queryDef.description,
        name: queryDef.name,
        queryString: queryDef.query,
        workGroup: workgroup.name,
      });

      // Add explicit dependency on workgroup
      namedQuery.addDependency(workgroup);

      // Also add dependency on database
      namedQuery.addDependency(database);
    });
  }
}
