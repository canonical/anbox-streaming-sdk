#!/bin/sh -ex
#
# Copyright 2025 Canonical Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

trivy fs "$GITHUB_WORKSPACE" --format json --output trivy-full-report.json

kev_cves="$(jq -r '.vulnerabilities[].cveID' kev.json | sort -u)"

found_cves="$(jq -r '.Results[] | select(.Vulnerabilities != null) | .Vulnerabilities[].VulnerabilityID' trivy-full-report.json | sort -u)"

matches="$(echo "$found_cves" | grep -F -f <(echo "$kev_cves") || true)"

if [ -n "$matches" ]; then
  echo "KEV listed vulnerabilities found."
  echo "$matches"
  exit 1
fi

echo "No KEV listed vulnerabilities found."