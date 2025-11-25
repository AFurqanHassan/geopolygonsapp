# GeoPolygons Deployment Guide

This guide explains how to deploy the GeoPolygons application to various hosting platforms.

## Prerequisites

- Git repository pushed to GitHub/GitLab/Bitbucket
- Node.js application with Express backend and Vite frontend
- Build script configured in `package.json`

## Build Locally

To test the build process locally:

```bash
npm run build
```

This creates:
- `dist/` folder with the built frontend
- `dist/index.js` with the bundled backend

To test the production build locally:

```bash
npm start
```

Visit `http://localhost:5000` to verify everything works.

---

## Option 1: Deploy to Render.com (Recommended)

Render is free for hobby projects and perfect for full-stack Node.js apps.

### Steps:

1. **Sign up at [render.com](https://render.com)**

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub/GitLab repository

3. **Configure the Service**
   - **Name**: `geopolygons` (or your preferred name)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

4. **Environment Variables** (Optional)
   - Add `NODE_ENV` = `production`
   - Add `PORT` = `5000`

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - You'll get a URL like `https://geopolygons.onrender.com`

### Using render.yaml (Alternative)

The `render.yaml` file in this repo allows one-click deployment:

1. Go to [render.com/dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your repository
4. Render will automatically detect `render.yaml` and configure everything

---

## Option 2: Deploy to Railway.app

Railway is another excellent option with a generous free tier.

### Steps:

1. **Sign up at [railway.app](https://railway.app)**

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Railway Auto-Detects Configuration**
   - Railway automatically detects Node.js apps
   - It will use your `package.json` scripts

4. **Configure (if needed)**
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

5. **Environment Variables**
   - Railway auto-sets `PORT`
   - Add `NODE_ENV` = `production` if needed

6. **Deploy**
   - Railway deploys automatically
   - You'll get a URL like `https://geopolygons.up.railway.app`

---

## Option 3: Deploy to Vercel (Requires Modifications)

Vercel is optimized for frontend apps but can work with some backend restructuring.

### Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

**Note**: You'll need to convert your Express routes to Vercel serverless functions. This requires significant restructuring and is not recommended unless you're familiar with Vercel's architecture.

---

## Option 4: Deploy to Heroku

Heroku is a classic choice but no longer has a free tier.

### Steps:

1. **Install Heroku CLI**
   - Download from [heroku.com](https://devcenter.heroku.com/articles/heroku-cli)

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   heroku create geopolygons
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Open App**
   ```bash
   heroku open
   ```

---

## Troubleshooting

### Build Fails

- Check that all dependencies are in `package.json` (not just `devDependencies`)
- Ensure Node.js version compatibility
- Check build logs for specific errors

### App Crashes on Start

- Verify `npm start` works locally after building
- Check that the `PORT` environment variable is used correctly
- Review application logs on the hosting platform

### Static Files Not Loading

- Ensure the build process completes successfully
- Check that the `dist/` folder is created
- Verify Express is serving static files from the correct path

---

## Environment Variables

If you need to add environment variables (e.g., for a database):

1. Create a `.env` file locally (already in `.gitignore`)
2. Add variables to your hosting platform's dashboard
3. Never commit `.env` to Git

Example variables:
- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=your_database_url`

---

## Recommended: Render.com

For this project, **Render.com** is the best choice because:
- ✅ Free tier available
- ✅ Easy setup with `render.yaml`
- ✅ Perfect for Node.js + Express apps
- ✅ Automatic HTTPS
- ✅ Continuous deployment from Git
- ✅ Good performance

---

## Next Steps After Deployment

1. Test all features on the deployed app
2. Set up custom domain (optional)
3. Monitor application logs
4. Set up error tracking (e.g., Sentry)
5. Configure CI/CD for automatic deployments

---

## Support

If you encounter issues:
- Check the hosting platform's documentation
- Review application logs
- Ensure the build works locally first
- Check that all environment variables are set correctly
