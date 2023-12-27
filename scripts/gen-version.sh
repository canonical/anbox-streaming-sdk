#!/bin/sh -e
#
# Copyright 2020 Canonical Ltd.
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

if [ -z "$BUILD_ID" ]; then
   BUILD_ID=0
fi

# We follow https://semver.org/; this will generate us the next patch version (we don't
# take any assumption if the next release will be a minor or major version) and append
# a pre-release qualifier to always sort lower than the final released version. To
# have incrementing pre-release version we take the build id from Jenkins.
# Example: 1.5.0 (old) -> 1.5.1-alpha.43
current_version=$(git describe --tags `git rev-list --tags --max-count=1`)
version_age=$(git log --oneline $(git describe --tags --abbrev=0 @)..@ | wc -l)
if [ "$version_age" != 0 ]; then
    gitr=$(git rev-parse --short HEAD)
    base_version="$(cat .base_version)"
    mmp=$(echo "$current_version"  | cut -d'-' -f1)
    if echo "$mmp" | grep -q "$base_version" ; then
        base_version="${mmp%.*}.$((${mmp##*.}+1))"
    else
        base_version="$base_version".0
    fi
    version="$base_version"-alpha."$BUILD_ID"+git"$gitr"
else
    # When the current commit is having the tag we can just use the current version
    version="$current_version"
fi

echo "$version"
