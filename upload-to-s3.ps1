# upload-to-s3.ps1
$PROFILE = "daftech-PowerUserAccess-882249827960"
$BUCKET = "dynamodash.com-882249827960-us-east-1"
$BUILD_DIR = "./out"  # or "./build" depending on your setup

# Check if build directory exists
if (!(Test-Path $BUILD_DIR)) {
    Write-Host "Build directory $BUILD_DIR not found. Please run 'npm run build' first."
    exit 1
}

Write-Host "Uploading files to S3..."

# Upload all files with sync
aws s3 sync $BUILD_DIR s3://$BUCKET --profile $PROFILE --delete

Write-Host "Upload complete!"

# Invalidate CloudFront cache
$DISTRIBUTION_ID = aws cloudformation describe-stacks --profile $PROFILE --region us-east-1 --stack-name dynamodash --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text

if ($DISTRIBUTION_ID) {
    Write-Host "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --profile $PROFILE --distribution-id $DISTRIBUTION_ID --paths "/*"
    Write-Host "Cache invalidation created!"
}
