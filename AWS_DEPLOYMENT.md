# AWS Deployment Guide
## AI Math Tutor - Automated Deployment to AWS Amplify

This guide covers deploying the AI Math Tutor application to AWS Amplify with automated CI/CD.

---

## Prerequisites

1. **AWS Account** - You need an active AWS account
2. **AWS CLI** - Install AWS CLI (optional, for local setup)
3. **GitHub Repository** - Code must be pushed to GitHub (already done ✅)

---

## Option 1: AWS Amplify (Recommended - Easiest)

AWS Amplify is the easiest way to deploy Next.js apps to AWS. It provides:
- Automatic CI/CD from GitHub
- Built-in SSL certificates
- Environment variable management
- Automatic scaling
- Custom domains

### Quick Setup (5 minutes)

#### Step 1: Connect to AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click **"New app"** → **"Host web app"**
3. Select **"GitHub"** as your source
4. Authorize AWS to access your GitHub account
5. Select repository: **`Davaakhatan/AIMathTutor`**
6. Select branch: **`main`**

#### Step 2: Configure Build Settings

Amplify will auto-detect Next.js. Use these build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

#### Step 3: Set Environment Variables

In Amplify Console → App Settings → Environment Variables, add:

```
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

#### Step 4: Deploy

Click **"Save and deploy"** - Amplify will:
- Install dependencies
- Build the app
- Deploy to a CDN
- Provide a URL (e.g., `https://main.xxxxx.amplifyapp.com`)

---

## Option 2: Automated Deployment with GitHub Actions

We can set up automated deployment that triggers on every push to main.

### Setup Instructions

1. **Create AWS IAM User** (for CI/CD):
   ```bash
   # Using AWS CLI
   aws iam create-user --user-name amplify-deploy-user
   aws iam attach-user-policy --user-name amplify-deploy-user --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-Amplify
   aws iam create-access-key --user-name amplify-deploy-user
   ```

2. **Add GitHub Secrets**:
   - Go to GitHub repo → Settings → Secrets → Actions
   - Add these secrets:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION` (e.g., `us-east-1`)
     - `AMPLIFY_APP_ID` (get this after creating Amplify app)

3. **The GitHub Actions workflow is already created** (see `.github/workflows/aws-deploy.yml`)

---

## Option 3: AWS App Runner (Containerized)

For more control, deploy using Docker containers.

### Dockerfile

A `Dockerfile` is already created in the project root.

### Deployment Steps

1. **Build Docker image**:
   ```bash
   docker build -t aitutor:latest .
   ```

2. **Push to Amazon ECR**:
   ```bash
   aws ecr create-repository --repository-name aitutor
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   docker tag aitutor:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/aitutor:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/aitutor:latest
   ```

3. **Create App Runner service**:
   - Go to AWS App Runner Console
   - Create service from ECR image
   - Configure environment variables
   - Deploy

---

## Environment Variables

Required environment variables for production:

```bash
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

Optional (for enhanced features):
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Custom Domain Setup

### In AWS Amplify:

1. Go to **App Settings** → **Domain management**
2. Click **Add domain**
3. Enter your domain name
4. Follow DNS configuration instructions
5. AWS will automatically provision SSL certificate

---

## Monitoring & Logs

### View Logs:

- **AWS Amplify**: Console → App → Monitoring → Logs
- **CloudWatch**: For detailed application logs

### Set Up Alerts:

1. Go to AWS CloudWatch
2. Create alarms for:
   - High error rates
   - High latency
   - Deployment failures

---

## Cost Estimation

### AWS Amplify:
- **Free Tier**: 15 GB storage, 1000 build minutes/month
- **After Free Tier**: ~$0.01 per build minute, ~$0.023 per GB storage
- **Estimated Monthly Cost**: $5-15 for small-medium traffic

### AWS App Runner:
- **Free Tier**: None
- **Cost**: ~$0.007 per vCPU hour, ~$0.0008 per GB memory hour
- **Estimated Monthly Cost**: $10-30 for small-medium traffic

---

## Troubleshooting

### Build Failures:

1. Check build logs in Amplify Console
2. Common issues:
   - Missing environment variables
   - Node version mismatch
   - Build timeout (increase in settings)

### Runtime Errors:

1. Check CloudWatch logs
2. Verify environment variables are set
3. Check API routes are working

### Deployment Automation Not Working:

1. Verify GitHub Secrets are set correctly
2. Check AWS IAM permissions
3. Review GitHub Actions logs

---

## Next Steps After Deployment

1. ✅ Test the deployed app
2. ✅ Set up custom domain
3. ✅ Configure monitoring alerts
4. ✅ Set up automated backups (if using database)
5. ✅ Enable CloudFront caching (if needed)

---

## Quick Reference Commands

```bash
# Check deployment status
aws amplify get-app --app-id <app-id>

# View logs
aws amplify list-jobs --app-id <app-id> --branch-name main

# Update environment variables
aws amplify update-app --app-id <app-id> --environment-variables key=value
```

---

## Support

For issues:
1. Check AWS Amplify documentation
2. Review build logs
3. Check GitHub Actions logs (if using automation)

---

**Note**: AWS Amplify is recommended for Next.js apps as it handles all the infrastructure automatically. The setup takes ~5 minutes and provides automatic deployments on every push to main branch.

