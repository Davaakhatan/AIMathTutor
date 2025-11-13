# Troubleshooting Guide

## Common Issues

### 404 Errors for Static Assets (CSS/JS files)

**Symptoms:**
- Browser console shows 404 errors for files like:
  - `/_next/static/css/app/layout.css`
  - `/_next/static/chunks/main-app.js`
  - Other Next.js static assets

**Cause:**
- Corrupted Next.js build cache in `.next` directory
- Dev server needs to be restarted after code changes

**Solution:**

**Quick Fix:**
```bash
# Stop the dev server (Ctrl+C), then:
rm -rf .next
npm run dev:3002
```

**Or use the helper script:**
```bash
npm run clean:dev
```

**Prevention:**
- If you see 404 errors, always clear the `.next` cache before restarting
- The `.next` directory is gitignored and safe to delete
- It will be regenerated automatically on next build

### Other Common Issues

#### Port Already in Use
```bash
# Kill process on port 3002
lsof -ti:3002 | xargs kill -9
# Or use a different port
npm run dev
```

#### TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf .next
npm run build
```

#### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Helper Scripts

- `npm run clean` - Remove `.next` build cache
- `npm run clean:dev` - Remove cache and start dev server
- `npm run dev:clean` - Clean and start dev server on port 3002

