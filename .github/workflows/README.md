# GitHub Actions Workflows

## AWS Deployment Workflow

**IMPORTANT**: The AWS deployment workflow is **OPTIONAL**!

AWS Amplify automatically deploys when you connect your GitHub repository. You don't need GitHub Actions unless you want manual control.

### Current Status

The workflow is configured but **disabled for automatic runs** because:
- AWS Amplify already auto-deploys from GitHub
- GitHub Secrets are not required for basic Amplify deployment
- The workflow only runs manually (workflow_dispatch)

### If You Want to Use GitHub Actions

1. **Set up GitHub Secrets**:
   - Go to: https://github.com/Davaakhatan/AIMathTutor/settings/secrets/actions
   - Add these secrets:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION` (e.g., `us-east-2`)
     - `AMPLIFY_APP_ID` (get from Amplify console)

2. **Enable automatic deployment**:
   - Edit `.github/workflows/aws-deploy.yml`
   - Uncomment the `push` trigger
   - Commit and push

### Current Setup (Recommended)

- ✅ AWS Amplify connected to GitHub
- ✅ Auto-deploys on push to main
- ✅ No GitHub Actions needed
- ✅ No GitHub Secrets needed

**The error you're seeing is harmless** - the workflow is trying to run but doesn't have credentials. Since Amplify auto-deploys, you can ignore this error or disable the workflow.

