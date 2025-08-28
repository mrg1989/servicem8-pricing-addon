# Render Deployment Guide

## 🚀 Deploy to Render (Free Tier)

### Step 1: Prepare Repository
1. Upload your `servicem8-addon` folder to GitHub
2. Make sure it includes:
   - ✅ package.json
   - ✅ index.js
   - ✅ All HTML files

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com)
2. Sign in with GitHub
3. Click **"New Web Service"**
4. Connect your GitHub repository
5. Set these deployment settings:

**Build Settings:**
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Node Version**: 18.x (or latest)

**Environment Variables:**
```
SERVICEM8_USERNAME=your_servicem8_email@domain.com
SERVICEM8_PASSWORD=your_servicem8_password
PORT=3000
```

### Step 3: Get Your Live URLs
After deployment, you'll get a URL like:
`https://your-app-name.onrender.com`

**Your ServiceM8 URLs will be:**
- Webhook: `https://your-app-name.onrender.com/webhook`
- Config: `https://your-app-name.onrender.com/config`
- Pricing Form: `https://your-app-name.onrender.com/pricing-form`

### Step 4: Test Deployment
Visit: `https://your-app-name.onrender.com/config`
Should return your pricing configuration JSON.

## ✅ Render Free Tier Limits
- ✅ 500 build minutes/month (plenty for testing)
- ✅ 100GB bandwidth/month (more than enough)
- ✅ 750 hours/month (basically always on)
- ✅ Auto-deploy on git push
- ✅ Custom domains
- ✅ HTTPS included

**Perfect for your ServiceM8 addon testing!**
