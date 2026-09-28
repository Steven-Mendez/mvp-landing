#!/usr/bin/env bash
set -euo pipefail
: "${BUCKET:?}" "${DISTRIBUTION_ID:?}"
aws s3 sync dist/_astro "s3://$BUCKET/_astro" --cache-control "public, max-age=31536000, immutable"
aws s3 sync dist "s3://$BUCKET" --delete --exclude "_astro/*" --cache-control "public, max-age=0, must-revalidate"
id=$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths '/*' --query Invalidation.Id --output text)
aws cloudfront wait invalidation-completed --distribution-id "$DISTRIBUTION_ID" --id "$id"
