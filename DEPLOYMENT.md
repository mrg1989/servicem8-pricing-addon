# ServiceM8 Staff Pricing Addon - Deployment Ready!

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "Deploy from GitHub repo"
4. Select this repository
5. Your addon will be live at: `https://your-app-name.railway.app`

### Option 2: Render
1. Go to [render.com](https://render.com)
2. Sign in with GitHub
3. Click "New Web Service"
4. Connect your GitHub repo
5. Your addon will be live at: `https://your-app-name.onrender.com`

## 🔧 Environment Variables Needed

Set these in your hosting platform:

```
SERVICEM8_USERNAME=your_servicem8_email@domain.com
SERVICEM8_PASSWORD=your_servicem8_password
PORT=3000
```

## 📋 ServiceM8 Addon Configuration

Once deployed, use these URLs in ServiceM8:

- **Webhook URL**: `https://your-deployed-url.com/webhook`
- **Configuration URL**: `https://your-deployed-url.com/config`
- **Pricing Form URL**: `https://your-deployed-url.com/pricing-form`

## ✅ Test Your Deployment

1. Visit: `https://your-deployed-url.com/config`
2. Should return JSON with pricing configuration
3. Visit: `https://your-deployed-url.com/test`
4. Should show the pricing test form

## 🔄 Live Editing

**YES!** Once hosted, you can edit the code and it will update in real-time:

1. **Railway**: Auto-deploys on every git push
2. **Render**: Auto-deploys on every git push
3. **Manual updates**: Use the platform's dashboard to redeploy

Your addon is **production-ready** and includes:
- ✅ Pricing calculation engine
- ✅ ServiceM8 API integration
- ✅ Webhook handlers
- ✅ HTML forms for UI
- ✅ Test mode for development
- ✅ Error handling
- ✅ Invoice item creation
