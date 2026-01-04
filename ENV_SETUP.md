# Environment Variables Setup for Vercel

## Required Environment Variable

You need to set the following environment variable in your Vercel project:

### Variable: `VITE_API_URL`

**Value:** `https://oneplace.now`

**Important:** 
- Do NOT include `/api` at the end
- The application automatically adds `/api` to all API calls

## How to Set in Vercel

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project: `one-place-frontend`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://oneplace.now`
   - **Environment:** Select all (Production, Preview, Development)
6. Click **Save**
7. **Important:** Redeploy your application for the changes to take effect

## Redeploy

After setting the environment variable:

1. Go to **Deployments** tab
2. Click the three dots (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic redeployment

## Verify Configuration

After redeployment, check:
- ✅ API calls are working (try logging in)
- ✅ No CORS errors in browser console
- ✅ Backend is accessible from frontend

## Current URLs

- **Frontend:** https://oneplace.now/
- **Backend:** https://oneplace.now

## Troubleshooting

### Issue: API calls failing with CORS errors

**Solution:** Make sure your backend has CORS configured to allow requests from:
- `https://oneplace.now`
- `https://one-place-frontend.vercel.app`
- `https://*.vercel.app` (for preview deployments)

### Issue: Environment variable not working

**Solution:**
1. Verify the variable name is exactly `VITE_API_URL` (case-sensitive)
2. Ensure you redeployed after setting the variable
3. Check that the variable is set for the correct environment (Production/Preview)

### Issue: 404 errors on API calls

**Solution:** 
- Verify the backend URL doesn't end with `/api`
- Check that the backend is running and accessible
- Test the backend URL directly: `https://oneplace.now/api/health`


