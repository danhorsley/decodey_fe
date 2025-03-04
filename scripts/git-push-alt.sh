
#!/bin/bash

# Check if GIT_TOKEN exists in environment or secrets
if [ -z "$GIT_TOKEN" ]; then
  echo "Error: GIT_TOKEN not found. Please add it to your secrets."
  echo "Go to the Secrets tool and add GIT_TOKEN with your GitHub personal access token."
  exit 1
fi

# Configure Git with credentials helper
echo "Setting up git credentials helper..."
git config --global credential.helper store

# Create credentials file
echo "https://oauth2:$GIT_TOKEN@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

echo "Credentials configured."

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

# Push to GitHub with standard command
echo "Pushing to GitHub..."
git push origin HEAD

push_status=$?
echo "Push completed with status: $push_status"

if [ $push_status -eq 0 ]; then
  echo "Successfully pushed to GitHub!"
else
  echo "Push failed. Please check your token and permissions."
fi

# Clean up credentials file for security
rm ~/.git-credentials
