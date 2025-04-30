#!/bin/bash -ex
# Copyright 2024 Canonical Ltd.  All rights reserved.

# The key is provided through a secret and we need to write it to
# disk in order to load it into the SSH agent
mkdir -p "$HOME"/.ssh
echo "$ANBOX_CLOUD_CI_BOT_SSH_KEY" > "$HOME"/.ssh/id_bot
chmod 0600 "$HOME"/.ssh/id_bot

# Setup a host alias we can use with git push
cat << EOF > "$HOME"/.ssh/config
Host github-anbox-streaming-sdk
  Hostname github.com
  IdentityFile=$HOME/.ssh/id_bot
EOF

# We need to trust the SSH host key from GitHub
ssh-keyscan github.com > "$HOME"/.ssh/known_hosts

# And now we can finally start the agent and load our key
eval "$(ssh-agent -s)"
ssh-add "$HOME"/.ssh/id_bot
