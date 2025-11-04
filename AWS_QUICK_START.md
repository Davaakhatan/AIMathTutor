# AWS Amplify Quick Start Guide
## Step-by-Step Deployment from AWS Console

### Current Status: You're on AWS Console Home

---

## Step 1: Navigate to AWS Amplify

From your current AWS Console Home page:

1. **Click the search bar** at the top (or press `Option+S`)
2. **Type**: `Amplify`
3. **Click**: "AWS Amplify" from the search results

OR

1. **Click the hamburger menu** (☰) in the top-left
2. **Scroll down** to find "Developer Tools" or "Mobile"
3. **Click**: "AWS Amplify"

---

## Step 2: Create New App

1. **Click the orange "New app" button** (top right)
2. **Select**: "Host web app"

---

## Step 3: Connect GitHub Repository

1. **Choose**: "GitHub" as your source
2. **Click**: "Authorize AWS Amplify"
3. **Authorize** AWS to access your GitHub account
4. **Select repository**: `Davaakhatan/AIMathTutor`
5. **Select branch**: `main`
6. **Click**: "Next"

---

## Step 4: Configure Build Settings

The `amplify.yml` file is already in your repo, so Amplify will auto-detect it.

**Verify these settings**:
- **App name**: `AIMathTutor` (or your preferred name)
- **Build settings**: Should auto-detect Next.js
- **Build specification**: Use `amplify.yml` (already configured)

**Click**: "Next"

---

## Step 5: Review and Create

1. **Review** the settings
2. **Click**: "Save and deploy"

**Note**: Don't add environment variables here - we'll do it after creation.

---

## Step 6: Add Environment Variables

While the build is running (or after):

1. **Go to**: App Settings → Environment Variables
2. **Click**: "Manage variables"
3. **Add**:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key
   - **Click**: "Save"
4. **Add** (optional):
   - **Key**: `NODE_ENV`
   - **Value**: `production`
   - **Click**: "Save"

---

## Step 7: Wait for Deployment

- The build will take **3-5 minutes**
- You can watch the progress in real-time
- Build logs will show in the console

---

## Step 8: Get Your App URL

Once deployment completes:
1. Your app will be live at: `https://main.xxxxx.amplifyapp.com`
2. The URL is shown in the Amplify console
3. **Test it** to make sure everything works!

---

## Enable Auto-Deployments (Optional)

After successful deployment:

1. **Get your App ID**:
   - In Amplify Console, it's shown in the URL or app settings
   - Example: `d1234567890`

2. **Add GitHub Secrets**:
   - Go to: https://github.com/Davaakhatan/AIMathTutor/settings/secrets/actions
   - Add secrets:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION` = `us-east-2` (your current region)
     - `AMPLIFY_APP_ID` = your app ID

3. **Create IAM User** (for CI/CD):
   ```bash
   # In AWS CLI or IAM Console
   # Create user with Amplify permissions
   ```

4. **Done!** Every push to `main` will auto-deploy.

---

## Troubleshooting

### If build fails:
- Check build logs in Amplify Console
- Verify `OPENAI_API_KEY` is set
- Check Node.js version (should be 18+)

### If app doesn't work:
- Check environment variables
- Review CloudWatch logs
- Verify API routes are accessible

---

## Next Steps After Deployment

1. ✅ Test the deployed app
2. ✅ Set up custom domain (optional)
3. ✅ Configure monitoring alerts
4. ✅ Enable auto-deployments

---

**Need Help?** Check `AWS_DEPLOYMENT.md` for detailed documentation.

