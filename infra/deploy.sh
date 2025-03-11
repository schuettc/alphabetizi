#!/bin/bash

# Exit on error
set -e

echo "🏗️  Starting deployment process..."

# Build the site
echo "🏢 Building the site..."
cd ../site
pnpm build
cd ../infra

# Build the CDK project
echo "📦 Building CDK project..."
pnpm build

# Deploy infrastructure
echo "🚀 Deploying infrastructure..."
pnpm cdk deploy AlphabetizeStack-production --require-approval never

echo "✅ Deployment complete!"
