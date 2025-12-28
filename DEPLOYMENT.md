# Vercel Deployment Guide

## Quick Start

### 1. Environment Variables

Before deploying, you need to set the following environment variable in Vercel:

**Variable Name:** `VITE_API_URL`  
**Value:** Your backend API URL (e.g., `https://api.oneplace.com`)

**Important Notes:**
- Do NOT include `/api` at the end of the URL
- The application automatically adds `/api` to all API calls
- For local development, use: `http://localhost:5000`
- For production, use your actual backend URL: `https://your-backend-domain.com`

### 2. Setting Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** Your backend API URL
   - **Environment:** Production, Preview, Development (select all)
4. Click **Save**

### 3. Deploy

#### Option A: Automatic Deployment (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository in Vercel
3. Vercel will automatically:
   - Detect it's a Vite project
   - Use the build command: `npm run build`
   - Deploy to production

#### Option B: Manual Deployment with Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. For production deployment:
```bash
vercel --prod
```

## Configuration Files

### vercel.json

The `vercel.json` file is already configured with:
- ✅ SPA routing (all routes redirect to index.html)
- ✅ Asset caching for better performance
- ✅ Build optimization
- ✅ Framework detection (Vite)

### vite.config.js

The Vite configuration includes:
- ✅ Build output directory: `dist`
- ✅ Code splitting for better performance
- ✅ Production optimizations

## Troubleshooting

### Issue: Routes not working (404 errors)

**Solution:** The `vercel.json` file includes a rewrite rule that redirects all routes to `index.html`. This should be working automatically. If not, verify the `vercel.json` file is in the root directory.

### Issue: API calls failing

**Solution:** 
1. Check that `VITE_API_URL` is set correctly in Vercel
2. Ensure your backend API has CORS enabled for your Vercel domain
3. Verify the API URL doesn't end with `/api`

### Issue: Build fails

**Solution:**
1. Check that all dependencies are in `package.json`
2. Ensure Node.js version is 16+ (Vercel uses Node 18 by default)
3. Check build logs in Vercel dashboard for specific errors

### Issue: Environment variables not working

**Solution:**
1. Environment variables must start with `VITE_` to be exposed to the frontend
2. After adding/changing environment variables, you need to redeploy
3. Check that variables are set for the correct environment (Production/Preview/Development)

## Post-Deployment Checklist

- [ ] Environment variable `VITE_API_URL` is set
- [ ] Backend API has CORS enabled for Vercel domain
- [ ] All routes are working (test navigation)
- [ ] API calls are successful (test login/features)
- [ ] Assets are loading correctly (images, CSS, JS)
- [ ] Build completes without errors

## Custom Domain

To use a custom domain:

1. Go to **Settings** → **Domains** in Vercel
2. Add your domain
3. Follow the DNS configuration instructions
4. Update your backend CORS settings to include the new domain

## Support

For issues or questions:
- Check Vercel documentation: https://vercel.com/docs
- Check Vite documentation: https://vitejs.dev

