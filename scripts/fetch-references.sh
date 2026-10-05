#!/usr/bin/env bash
# Shallow-clones Amazon's sample apps into reference/ (gitignored) for study and for Claude to read.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p reference
for repo in \
  react-native-multi-tv-app-sample \
  vega-tv-interfaces-sample \
  vega-video-sample \
  hello-world-fire-tv-react-native; do
  if [ -d "reference/$repo" ]; then
    echo "↻ $repo"; git -C "reference/$repo" pull --ff-only -q
  else
    echo "↓ $repo"; git clone --depth 1 -q "https://github.com/AmazonAppDev/$repo.git" "reference/$repo"
  fi
done
echo "Done → reference/"
