# POS-SaaS - Deployment Guide ke Vercel

## 🚀 Quick Deploy to Vercel

### Prerequisites
- ✅ Akun Vercel (gratis)
- ✅ Akun PlanetScale atau MySQL cloud
- ✅ Code sudah di GitHub

---

## Step 1: Push ke GitHub

```bash
cd C:\laragon\www\pos-saas

# Init git (jika belum)
git init
git add .
git commit -m "Initial commit: POS-SaaS with Offline-First"

# Create repo di GitHub, lalu:
git remote add origin https://github.com/YOUR_USERNAME/pos-saas.git
git branch -M main
git push -u origin main
```

---

## Step 2: Setup Database di PlanetScale

### Option A: PlanetScale (Recommended)
1. Buka https://planetscale.com
2. Create account (free tier available)
3. Create database: `pos-saas-prod`
4. Get connection string
5. Copy DATABASE_URL

### Option B: Railway PostgreSQL
1. Buka https://railway.app
2. Create project → Add PostgreSQL
3. Copy DATABASE_URL

---

## Step 3: Deploy ke Vercel

### Via Vercel Dashboard (Recommended)

1. **Login ke Vercel**
   - Buka https://vercel.com
   - Login dengan GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Select repo: `pos-saas`
   - Framework: Next.js (auto-detected)

3. **Configure Project**
   ```
   Build Command: prisma generate && next build
   Output Directory: .next
   Install Command: npm install
   ```

4. **Environment Variables**
   Click "Environment Variables" dan tambahkan:
   
   ```env
   DATABASE_URL=mysql://[user]:[pass]@[host]/pos-saas-prod
   NEXTAUTH_SECRET=[generate-random-string]
   NEXTAUTH_URL=https://pos-saas.vercel.app
   ```
   
   **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```
   
   Atau online: https://generate-secret.vercel.app

5. **Deploy**
   - Click "Deploy"
   - Wait ~2-3 minutes
   - ✅ Live URL: `https://pos-saas-[hash].vercel.app`

---

## Step 4: Run Database Migration

Setelah deploy pertama kali:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Run migration di production
vercel env pull .env.production
npx prisma migrate deploy
npx prisma db seed
```

**Alternative: Manual via PlanetScale**
```bash
# Connect to PlanetScale
pscale connect pos-saas-prod main --port 3309

# Update .env dengan localhost:3309
# Run migration
npx prisma migrate dev
npx prisma db seed
```

---

## Step 5: Configure Custom Domain (Optional)

1. Di Vercel Dashboard → Settings → Domains
2. Add domain: `pos.yourdomain.com`
3. Update DNS:
   ```
   Type: CNAME
   Name: pos
   Value: cname.vercel-dns.com
   ```
4. Update `NEXTAUTH_URL` di environment variables

---

## 🔒 Environment Variables Production

```env
# Database (PlanetScale)
DATABASE_URL="mysql://[username]:[password]@[host]/pos-saas-prod?sslaccept=strict"

# Auth (generate baru untuk production!)
NEXTAUTH_SECRET="[random-64-char-string]"
NEXTAUTH_URL="https://pos-saas.vercel.app"

# Optional: Monitoring
NEXT_PUBLIC_SENTRY_DSN="[your-sentry-dsn]"
```

---

## 🧪 Test Production Deploy

1. **Homepage**
   ```
   https://pos-saas.vercel.app
   ```

2. **Login**
   ```
   Email: admin@pos.com
   Password: password123
   ```

3. **Test Offline Mode**
   - Buka /transaksi
   - DevTools → Network → Offline
   - Buat transaksi → Should work! ✅

4. **Check Sync**
   - Disable offline
   - Wait 30 seconds
   - Check database → Data synced

---

## 📊 Vercel Features Auto-Enabled

✅ **Edge Network** - Global CDN  
✅ **Automatic HTTPS** - SSL included  
✅ **Preview Deployments** - Every PR gets unique URL  
✅ **Analytics** - Built-in performance monitoring  
✅ **Serverless Functions** - Auto-scaling API routes  

---

## 🔄 Continuous Deployment

Setelah setup, setiap push ke GitHub otomatis deploy:

```bash
# Make changes
git add .
git commit -m "Add new feature"
git push

# Vercel auto-deploy dalam ~2 menit
# Get preview URL di GitHub PR
```

---

## 🐛 Troubleshooting

### Build Error: Prisma
```bash
# Pastikan DATABASE_URL set di Vercel
# Re-deploy setelah set env vars
```

### 500 Error: Database Connection
```bash
# Check DATABASE_URL format
# PlanetScale perlu ?sslaccept=strict
mysql://user:pass@host/db?sslaccept=strict
```

### NextAuth Error
```bash
# Generate new NEXTAUTH_SECRET
# Update NEXTAUTH_URL dengan production URL
```

### Offline Mode Not Working
```bash
# Check browser console
# IndexedDB might be blocked in some browsers
# Test in Chrome/Firefox
```

---

## 📈 Post-Deployment Checklist

- [ ] Database migrated & seeded
- [ ] Login works
- [ ] Transaksi offline works
- [ ] Sync to database works
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Error monitoring setup (Sentry)
- [ ] Backup strategy planned

---

## 🎯 Scaling Tips

### Free Tier Limits
- **Vercel**: 100GB bandwidth/month
- **PlanetScale**: 5GB storage, 1 billion row reads

### When to Upgrade
- > 1000 daily active users
- > 10,000 transactions/day
- Need team collaboration

### Performance Optimization
```typescript
// Enable Next.js caching
export const revalidate = 3600 // 1 hour

// Use Vercel Edge Config for settings
import { get } from '@vercel/edge-config'
```

---

## 📞 Support & Resources

- Vercel Docs: https://vercel.com/docs
- PlanetScale Docs: https://planetscale.com/docs
- Next.js Deploy: https://nextjs.org/docs/deployment

---

## 🎉 You're Live!

Your POS-SaaS with Offline-First is now:
- ✅ Deployed to global CDN
- ✅ Auto-scaling
- ✅ HTTPS enabled
- ✅ Continuous deployment
- ✅ Production-ready

**Share your URL!** 🚀
