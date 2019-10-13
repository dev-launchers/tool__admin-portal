#!/bin/bash
# Replace variables in wrangler.toml with env vars defined in travis
sed -e "s~ACCOUNT_ID~$ACCOUNT_ID~" -e "s~ZONE_ID~$ZONE_ID~" -e "s~ROUTE~$ROUTE~" -e "s~ADMIN_PORTAL_KV_NAMESPACES~$ADMIN_PORTAL_KV_NAMESPACES~" wrangler.toml > templated_wrangler.toml
mv templated_wrangler.toml wrangler.toml
$CF_API_KEY $CF_EMAIL wrangler publish