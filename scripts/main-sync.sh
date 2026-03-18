#!/usr/bin/env bash
set -euo pipefail

git checkout main
git pull --ff-only origin main
