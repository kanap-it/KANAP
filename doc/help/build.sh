#!/bin/bash
# Build script for MkDocs documentation
# Used by Cloudflare Pages and local development

set -e

# Install dependencies
pip install -r requirements.txt

# Build the site
mkdocs build

echo "Build complete! Output in ./site/"
