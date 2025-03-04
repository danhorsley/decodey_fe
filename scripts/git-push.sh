
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
# Create URL with token
TOKEN_URL="https://$GIT_TOKEN@${REPO_URL#https://}"

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

# Push to GitHub
git push "$TOKEN_URL"

echo "Successfully pushed to GitHub!"
