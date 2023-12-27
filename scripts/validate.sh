#!/bin/bash -e
#
# Copyright 2022 Canonical Ltd.
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

ALLOWLIST="./sdk-files.allowlist"
SDK_ZIP_TARBALL="./anbox-streaming-sdk.zip"

show_help() {
    cat <<'EOF'
Usage: validate.sh [OPTIONS]

Validates Anbox Streaming SDK by checking that all included source files are in the allowlist

optional arguments:
  --allowlist=<path>              Path to the file holding the list of allowed files into the sdk (default: ./sdk-files.allowlist)
  --sdk-zip-tarball=<path>        Path to the streaming sdk zip tarball (default: ./anbox-streaming-sdk.zip)
EOF
}

while [ -n "$1" ]; do
	case "$1" in
		--help)
			show_help
			exit
			;;
		--allowlist=*)
			ALLOWLIST=${1#*=}
			shift
			;;
		--sdk-zip-tarball=*)
			SDK_ZIP_TARBALL=${1#*=}
			shift
			;;
		*)
			echo "Unknown command: $1"
			exit 1
			;;
	esac
done

if [ ! -f "$SDK_ZIP_TARBALL" ]; then
	echo "Anbox Streaming SDK is missing"
	exit 1
fi

if [ ! -f "$ALLOWLIST" ]; then
	echo "File allowlist is missing"
	exit 1
fi

remove() {
	local file_pattern=$1
	local sdk_version=$2

	# To match the versionized file like apk
	local path_to_remove="$(printf $1 $2)"
	if [ -f "$path_to_remove" ]; then
		rm "$path_to_remove"
	fi

	# Remove the current dir once it's empty
	# NOTE: Ignore the top folder.
	local dir_path="$(dirname $path_to_remove)"
	while [ -z "$(ls -A $dir_path)" ] &&
		[ "$dir_path" != "." ]; do
		rmdir $dir_path
		dir_path="$(dirname $dir_path)"
	done
}

search_for_remaining_files() {
	local dir_path=$1
	output=$(find "$dir_path" -type f)
	echo "$output"
}

(
	tmpfolder=$(mktemp -d)
	cleanup() {
		rm -rf "$tmpfolder"
	}
	trap cleanup EXIT INT

	unzip -qq "$SDK_ZIP_TARBALL" -d "$tmpfolder"
	cd "$tmpfolder"/anbox-streaming-sdk_*
	sdk_version="$(pwd | cut -d_ -f2)"

	# Read allowlist and search for every file into the tmp folder.
	# Once it is found, delete it.
	while IFS='' read -r line || [[ -n "$line" ]]; do
		remove "$line" "$sdk_version"
	done < "$ALLOWLIST"

	# There should remain no file after processing all the allowlist
	remaining_contents="$(search_for_remaining_files ./)"
	if [ -n "$remaining_contents" ]; then
	   cat <<EOF
echo "Found some source files in the SDK that are not in the allowlist :("
$remaining_contents
EOF
	  exit 1
	else
	  echo "The Anbox Streaming SDK is well built."
	fi
)
