# Alphabetize Record Collection Survey

A web application for surveying users on how they would alphabetize their record collections. Built with Vite React (TypeScript) for the frontend and AWS CDK for deployment to S3/CloudFront with a serverless backend.

## Project Structure

The project is organized into two main directories:

- `infra/`: Contains AWS CDK infrastructure code
- `site/`: Contains the Vite React frontend application

## Prerequisites

- Node.js (v18 or later)
- pnpm (v9 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK installed globally or used via npx

## Infrastructure Setup

The infrastructure is deployed using AWS CDK and includes:

- S3 bucket for static website hosting
- CloudFront distribution for content delivery
- API Gateway for RESTful API endpoints
- Lambda function for processing survey submissions
- DynamoDB table for storing survey responses
- ACM certificate for HTTPS support
- Route 53 records for custom domain

## Single-Stack Deployment

This project uses a single-stack approach where both frontend and backend are deployed from a single CDK stack. The frontend is automatically built during the CDK deployment process using CDK's bundling capabilities.

### Certificate Validation

SSL certificate validation is handled automatically through DNS validation. The certificate is created in the same stack as the rest of the infrastructure, and CloudFormation handles waiting for the validation to complete.

To deploy the application:

```bash
cd infra
pnpm install
pnpm run build
pnpm run deploy
```

The deployment process will:

1. Create and validate the SSL certificate via DNS validation
2. Automatically build the frontend React application
3. Generate a `config.json` file with API details for the frontend
4. Create all necessary AWS resources
5. Deploy the frontend to S3 and configure CloudFront
6. Set up the custom domain (app.cataloging.music)

After deployment, the site will be available at `https://app.cataloging.music` once the DNS records propagate (which can take up to 30 minutes).

## Frontend Development

For local development of the frontend:

```bash
cd site
pnpm install
pnpm run dev
```

## Security Considerations

- No personal user data is collected
- CORS is configured for security
- CloudFront is used to securely deliver content
- The S3 bucket is not publicly accessible directly (only through CloudFront)
- API Gateway is protected with an API key
- WAF rules provide rate limiting protection

## Survey Questions

The survey includes questions about how users would organize their record collections, such as:

- How to alphabetize bands with "The" in their name
- Where to file artists with special characters or symbols
- How to handle various edge cases in record organization

## License

ISC
