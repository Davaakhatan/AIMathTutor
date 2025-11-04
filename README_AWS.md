# Quick Start: Deploy to AWS

## 🚀 Fastest Method (5 minutes)

### AWS Amplify - Automated Deployment

1. **Go to AWS Amplify Console**
   - Visit: https://console.aws.amazon.com/amplify
   - Sign in with your AWS account

2. **Create New App**
   - Click "New app" → "Host web app"
   - Select "GitHub"
   - Authorize AWS to access GitHub
   - Select repository: `Davaakhatan/AIMathTutor`
   - Select branch: `main`

3. **Configure Build**
   - Amplify auto-detects Next.js
   - The `amplify.yml` file is already configured
   - Click "Save and deploy"

4. **Add Environment Variables**
   - Go to App Settings → Environment Variables
   - Add: `OPENAI_API_KEY` = your OpenAI API key
   - Add: `NODE_ENV` = `production`

5. **Deploy**
   - Click "Save and deploy"
   - Wait 3-5 minutes
   - Your app will be live at: `https://main.xxxxx.amplifyapp.com`

---

## 🔄 Automated Deployments (GitHub Actions)

After setting up Amplify, enable automated deployments:

1. **Get Amplify App ID**
   - In Amplify Console, copy your App ID

2. **Add GitHub Secrets**
   - Go to: https://github.com/Davaakhatan/AIMathTutor/settings/secrets/actions
   - Add secrets:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION` (e.g., `us-east-1`)
     - `AMPLIFY_APP_ID` (your app ID from step 1)

3. **Create AWS IAM User** (for CI/CD)
   ```bash
   aws iam create-user --user-name amplify-deploy-user
   aws iam attach-user-policy --user-name amplify-deploy-user \
     --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-Amplify
   aws iam create-access-key --user-name amplify-deploy-user
   ```

4. **Done!**
   - Every push to `main` will auto-deploy
   - Check `.github/workflows/aws-deploy.yml` for workflow

---

## 📝 Manual Deployment Script

If you prefer manual control:

```bash
# Set up (one time)
export AMPLIFY_APP_ID=your-app-id
export AWS_REGION=us-east-1

# Deploy
./scripts/deploy-aws.sh
```

---

## 🐳 Docker Deployment (AWS App Runner)

For containerized deployment:

1. **Build and push to ECR**
   ```bash
   ./scripts/setup-aws.sh  # Choose option 2
   # Follow the instructions shown
   ```

2. **Create App Runner service**
   - Use the ECR image
   - Set environment variables
   - Deploy

---

## 📚 Full Documentation

See `AWS_DEPLOYMENT.md` for:
- Detailed setup instructions
- Troubleshooting
- Cost estimation
- Custom domain setup
- Monitoring setup

---

## ✅ Quick Checklist

- [ ] AWS account created
- [ ] GitHub repository connected
- [ ] Amplify app created
- [ ] Environment variables set (OPENAI_API_KEY)
- [ ] First deployment successful
- [ ] Custom domain configured (optional)
- [ ] Monitoring alerts set up (optional)

---

**Recommended**: Start with AWS Amplify - it's the fastest and easiest option!

