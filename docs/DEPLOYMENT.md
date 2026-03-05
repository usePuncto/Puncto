# 🚀 Vercel Deployment Guide for Puncto

This guide will walk you through deploying your Puncto marketing website to Vercel.

## Prerequisites

- ✅ GitHub account (or GitLab/Bitbucket)
- ✅ Vercel account (free tier works)
- ✅ Your code pushed to a Git repository
- ✅ Environment variables ready

---

## Step 1: Prepare Your Repository

### 1.1 Push Your Code to GitHub

1. **Initialize Git** (if not already done):
   ```bash
   cd C:\Users\begam\Desktop\Puncto
   git init
   git add .
   git commit -m "Initial commit - Marketing website ready for deployment"
   ```

2. **Create a GitHub Repository**:
   - Go to https://github.com/new
   - Create a new repository (e.g., `puncto-marketing`)
   - **DO NOT** initialize with README, .gitignore, or license

3. **Push Your Code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/puncto-marketing.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Create Vercel Account & Project

### 2.1 Sign Up / Login to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended for easy integration)

### 2.2 Import Your Project

1. After logging in, click **"Add New..."** → **"Project"**
2. Click **"Import Git Repository"**
3. Find your `puncto-marketing` repository and click **"Import"**

---

## Step 3: Configure Project Settings

### 3.1 Project Configuration

Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset:** Next.js
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

### 3.2 Environment Variables

Click **"Environment Variables"** and add the following:

#### Firebase Configuration (Required)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

#### Firebase Admin (Required for Server-Side)
```
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
```

**OR** (Alternative - JSON format):
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

#### Stripe Configuration (Required for Payments)
```
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)

# Stripe Price IDs
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_GROWTH=price_...
STRIPE_PRICE_ID_PRO=price_...
```

#### Application URL (Required)
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```
(Update this after first deployment with your actual domain)

#### Optional: Email Service (SendGrid)
```
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@puncto.com.br
SENDGRID_FROM_NAME=Puncto
```

#### Optional: Platform Admin Secret
```
PLATFORM_ADMIN_CREATE_SECRET=your_random_secret_here
```

### 3.3 Where to Find These Values

**Firebase:**
- Go to Firebase Console → Project Settings → General
- Scroll to "Your apps" → Web app config
- Copy the values from `firebaseConfig`

**Firebase Admin:**
- Firebase Console → Project Settings → Service Accounts
- Click "Generate New Private Key"
- Download JSON file and extract values OR use the JSON directly

**Stripe:**
- Stripe Dashboard → Developers → API Keys
- Copy Secret Key and Publishable Key
- For Webhook Secret: Webhooks → Add endpoint → Copy signing secret

---

## Step 4: Deploy

### 4.1 Initial Deployment

1. After adding all environment variables, click **"Deploy"**
2. Wait for the build to complete (usually 2-5 minutes)
3. Vercel will provide you with a URL like: `https://puncto-marketing-xyz.vercel.app`

### 4.2 Verify Deployment

1. Visit your deployment URL
2. Check that:
   - ✅ Header and Footer appear
   - ✅ All pages load correctly
   - ✅ No console errors
   - ✅ Images and assets load

---

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Domain in Vercel

1. Go to your project → **Settings** → **Domains**
2. Enter your domain (e.g., `puncto.com.br`)
3. Follow Vercel's DNS configuration instructions

### 5.2 Update DNS Records

Add these DNS records at your domain registrar:

**For apex domain (puncto.com.br):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 5.3 Update Environment Variables

After domain is configured, update:
```
NEXT_PUBLIC_APP_URL=https://puncto.com.br
```

Redeploy to apply changes.

---

## Step 6: Configure Stripe Webhooks

### 6.1 Add Webhook Endpoint in Stripe

1. Go to Stripe Dashboard → **Webhooks**
2. Click **"Add endpoint"**
3. Enter: `https://your-domain.vercel.app/api/subscriptions/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing Secret** and add to Vercel as `STRIPE_WEBHOOK_SECRET`

---

## Step 7: Post-Deployment Checklist

- [ ] Test homepage loads correctly
- [ ] Test all marketing pages (`/features`, `/pricing`, `/about`, etc.)
- [ ] Verify Header and Footer appear on all pages
- [ ] Test contact form submission
- [ ] Verify Stripe checkout flow (test mode)
- [ ] Check Firebase authentication works
- [ ] Verify environment variables are set correctly
- [ ] Test on mobile devices
- [ ] Check Google Analytics (if configured)
- [ ] Verify SSL certificate is active (automatic with Vercel)

---

## Troubleshooting

### Build Fails

1. **Check build logs** in Vercel dashboard
2. **Common issues:**
   - Missing environment variables
   - TypeScript errors
   - Missing dependencies
   - Build timeout (increase in settings)

### Environment Variables Not Working

1. Ensure variables start with `NEXT_PUBLIC_` for client-side access
2. Redeploy after adding new variables
3. Check variable names match exactly (case-sensitive)

### Firebase Errors

1. Verify Firebase config values are correct
2. Check Firebase project has billing enabled (if using paid features)
3. Ensure Firebase Admin credentials are valid

### Domain Not Working

1. Wait 24-48 hours for DNS propagation
2. Verify DNS records are correct
3. Check domain is verified in Vercel

---

## Continuous Deployment

Vercel automatically deploys when you push to your main branch:

1. Make changes locally
2. Commit and push:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. Vercel will automatically build and deploy

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Vercel Support: https://vercel.com/support

---

## Quick Reference: Required Environment Variables

```bash
# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase (Admin)
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_ID_STARTER
STRIPE_PRICE_ID_GROWTH
STRIPE_PRICE_ID_PRO

# App
NEXT_PUBLIC_APP_URL
```
