
#!/bin/bash

# Check if GIT_TOKEN exists in environment or secrets
if [ -z "$GIT_TOKEN" ]; then
  echo "Error: GIT_TOKEN not found. Please add it to your secrets."
  echo "Go to the Secrets tool and add GIT_TOKEN with your GitHub personal access token."
  exit 1
fi

# Configure Git to use the token
REPO_URL=$(git config --get remote.origin.url)
# Remove any existing credentials from the URL
REPO_URL=$(echo $REPO_URL | sed -E 's|https://.*@github.com/|https://github.com/|')
# Create URL with token in the recommended format
if [[ $REPO_URL == *"github.com"* ]]; then
  # For GitHub specifically
  TOKEN_URL="https://oauth2:$GIT_TOKEN@${REPO_URL#https://}"
else
  # For other Git providers
  TOKEN_URL="https://$GIT_TOKEN@${REPO_URL#https://}"
fi
echo "Created token URL (token hidden)"

# Add all changes
git add .

# Commit with message
echo "Enter commit message:"
read commit_message

# If message is empty, use default
if [ -z "$commit_message" ]; then
  commit_message="Update files"
fi

git commit -m "$commit_message"

# Push to GitHub with verbose logging
echo "Attempting to push to: ${TOKEN_URL//$GIT_TOKEN/****}"
git push -v "$TOKEN_URL"

echo "Push command completed with exit code: $?"
echo "Successfully pushed to GitHub!"
