# ServiceM8 Addon - Bandwidth Usage Estimate

## 📊 Realistic Usage for Your Addon

### **Incoming Webhook Traffic**
- ServiceM8 webhook: ~1KB per job event
- 1000 jobs/month = 1MB
- Even 10,000 jobs/month = 10MB

### **Outgoing API Calls**
- ServiceM8 API responses: ~2KB per call
- Update job pricing: ~1KB per update
- 1000 pricing updates/month = ~3MB

### **Web Interface Usage**
- Pricing form loads: ~5KB each
- Config endpoint: ~1KB each
- 1000 form views/month = 5MB

## 🎯 **Total Monthly Estimate**
- **Heavy usage scenario**: 20MB/month
- **Your free limit**: 100,000MB (100GB)
- **Usage percentage**: 0.02% of your limit

## ✅ **Conclusion**
Your ServiceM8 addon will use **less than 1%** of Render's free bandwidth.

**You're nowhere near the limits!**

### **Build Minutes Reality**
- First deployment: ~3 minutes
- Code updates: ~1-2 minutes each
- You could deploy **200+ times/month** easily

**Perfect for development and testing!**
