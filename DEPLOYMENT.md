# Deployment Guide
## AI Math Tutor - Socratic Learning Assistant

This guide covers deploying the AI Math Tutor application to production.

---

## Prerequisites

- Node.js 18+ installed
- OpenAI API key with sufficient credits
- Git repository (optional, for version control)
- Vercel account (recommended) or another hosting platform

---

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the recommended platform for Next.js applications.

#### Step 1: Prepare Your Repository

```bash
# Ensure your code is committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### Step 2: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com)**
   - Sign up or log in
   - Click "New Project"

2. **Import Your Repository**
   - Connect your GitHub/GitLab/Bitbucket account
   - Select the AITutor repository
   - Click "Import"

3. **Configure Environment Variables**
   - Go to "Environment Variables"
   - Add:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```
   - Click "Save"

4. **Deploy**
   - Vercel will automatically detect Next.js
   - Click "Deploy"
   - Wait for build to complete

5. **Access Your App**
   - Your app will be live at `https://your-project-name.vercel.app`
   - You can add a custom domain in settings

#### Vercel Configuration

Create `vercel.json` (optional):
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

---

### Option 2: Netlify

#### Step 1: Build Settings

In Netlify dashboard:
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: 18+

#### Step 2: Environment Variables

Add in Netlify dashboard:
- `OPENAI_API_KEY`

#### Step 3: Deploy

Connect your repository and deploy.

---

### Option 3: Self-Hosted (VPS/Server)

#### Step 1: Build the Application

```bash
# On your server
git clone your-repo-url
cd AITutor
npm install
npm run build
```

#### Step 2: Set Environment Variables

```bash
# Create .env.production
nano .env.production
```

Add:
```
OPENAI_API_KEY=your_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### Step 3: Run with PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start npm --name "ai-tutor" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Step 4: Setup Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 5: Setup SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `NODE_ENV` | Environment | `production` |

---

## Pre-Deployment Checklist

- [ ] All environment variables set
- [ ] API keys are secure (not in code)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Tests pass (if applicable)
- [ ] Error handling is robust
- [ ] Rate limiting considered
- [ ] CORS configured (if needed)
- [ ] Analytics/monitoring set up (optional)

---

## Post-Deployment

### 1. Verify Deployment

- [ ] App loads correctly
- [ ] Problem input works (text)
- [ ] Image upload works
- [ ] Chat interface functions
- [ ] Math rendering works
- [ ] API calls succeed

### 2. Monitor Performance

- Check API response times
- Monitor OpenAI API usage
- Watch for errors in logs
- Track user interactions (if analytics added)

### 3. Security Considerations

- ✅ API keys are in environment variables (not in code)
- ✅ HTTPS enabled (required for production)
- ✅ Rate limiting (consider adding)
- ✅ Input validation on all endpoints
- ✅ Error messages don't expose internals

---

## Troubleshooting

### Build Fails

**Issue**: Build errors during deployment

**Solutions**:
- Check Node.js version (needs 18+)
- Verify all dependencies in `package.json`
- Check for TypeScript errors: `npm run build` locally
- Review build logs for specific errors

### API Errors

**Issue**: OpenAI API calls failing

**Solutions**:
- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Verify API key has access to GPT-4 models
- Check rate limits haven't been exceeded

### Image Upload Not Working

**Issue**: Image parsing fails

**Solutions**:
- Verify file size limits (10MB default)
- Check image format (JPG, PNG)
- Verify OpenAI Vision API access
- Check network connectivity

### Math Not Rendering

**Issue**: Equations don't display

**Solutions**:
- Check browser console for errors
- Verify KaTeX CSS is loaded
- Check LaTeX syntax in responses
- Verify `react-katex` is installed

---

## Scaling Considerations

### Current Setup (MVP)
- Single instance
- In-memory session storage
- Direct API calls

### Future Enhancements
- **Database**: Store sessions in database (PostgreSQL, MongoDB)
- **Redis**: Cache common problems/responses
- **CDN**: Serve static assets
- **Load Balancing**: Multiple instances
- **Queue System**: For handling high load

---

## Cost Estimation

### OpenAI API Costs (Approximate)

- **GPT-4 Vision** (image parsing): ~$0.01-0.03 per image
- **GPT-4** (dialogue): ~$0.03-0.06 per conversation turn

**Estimated Monthly Cost** (100 users, 10 problems each):
- Image parsing: ~$10-30
- Dialogue: ~$30-60
- **Total**: ~$40-90/month

*Note: Actual costs vary based on usage patterns*

---

## Monitoring & Analytics

### Recommended Tools

1. **Vercel Analytics** (if using Vercel)
2. **Sentry** (error tracking)
3. **LogRocket** (session replay)
4. **Google Analytics** (user behavior)

### Key Metrics to Track

- Number of problems solved
- Average conversation length
- Stuck count distribution
- API response times
- Error rates
- User satisfaction

---

## Backup & Recovery

### Database Backup (if using database)

```bash
# Backup
pg_dump your_database > backup.sql

# Restore
psql your_database < backup.sql
```

### Environment Variables Backup

Store environment variables securely:
- Use password manager
- Document in secure location
- Never commit to git

---

## Updates & Maintenance

### Updating the Application

1. **Pull latest changes**
   ```bash
   git pull origin main
   ```

2. **Install dependencies** (if changed)
   ```bash
   npm install
   ```

3. **Rebuild**
   ```bash
   npm run build
   ```

4. **Restart** (if self-hosted)
   ```bash
   pm2 restart ai-tutor
   ```

### Vercel Auto-Deploy

Vercel automatically deploys on git push to main branch.

---

## Support

For issues or questions:
- Check documentation
- Review error logs
- Contact: john.chen@superbuilders.school

---

## License

[Add your license information here]

