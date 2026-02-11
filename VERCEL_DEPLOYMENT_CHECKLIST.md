# ✅ Vercel Deployment Checklist

## Pre-Deployment Steps

### 1. Code Preparation
- [ ] All code committed to Git
- [ ] Code pushed to GitHub/GitLab/Bitbucket
- [ ] No sensitive data in code (check `.gitignore`)
- [ ] Build passes locally (`npm run build`)

### 2. Vercel Account Setup
- [ ] Create account at https://vercel.com
- [ ] Connect GitHub account (recommended)

### 3. Import Project
- [ ] Click "Add New Project"
- [ ] Import your repository
- [ ] Verify framework is detected as "Next.js"

---

## Environment Variables to Add in Vercel

### Required - Firebase (Client)
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Required - Firebase Admin (Server)
Choose ONE method:

**Method 1: Individual Variables**
```
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

**Method 2: JSON String (Easier)**
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

### Required - Stripe
```
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_GROWTH=price_...
STRIPE_PRICE_ID_PRO=price_...
```

### Required - Application
```
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```
(Update after first deployment with actual domain)

### Optional - Analytics
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FB_PIXEL_ID=123456789
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=123456
NEXT_PUBLIC_HOTJAR_ID=1234567
NEXT_PUBLIC_CLARITY_ID=abc123xyz
```

### Optional - Email (SendGrid)
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@puncto.com.br
SENDGRID_FROM_NAME=Puncto
```

### Optional - Real-time (Centrifugo)
```
CENTRIFUGO_API_KEY=your_api_key
CENTRIFUGO_TOKEN_HMAC_SECRET=your_secret
NEXT_PUBLIC_CENTRIFUGO_URL=https://your-centrifugo-instance.com
```

### Optional - Security
```
PLATFORM_ADMIN_CREATE_SECRET=your_random_secret_string
```

---

## Deployment Steps

1. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add each variable above
   - Select environments: Production, Preview, Development

2. **Deploy**
   - Click "Deploy"
   - Wait for build (2-5 minutes)
   - Check build logs for errors

3. **Verify**
   - Visit deployment URL
   - Test homepage
   - Test all marketing pages
   - Check console for errors

4. **Configure Domain** (if needed)
   - Settings → Domains
   - Add your domain
   - Update DNS records
   - Update `NEXT_PUBLIC_APP_URL`

5. **Configure Stripe Webhook**
   - Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/subscriptions/webhook`
   - Copy signing secret → Add to Vercel as `STRIPE_WEBHOOK_SECRET`
   - Redeploy

---

## Quick Commands

```bash
# Test build locally
npm run build

# Check for TypeScript errors
npm run lint

# Push to deploy
git add .
git commit -m "Ready for deployment"
git push origin main
```

---

## Troubleshooting

**Build fails:**
- Check build logs in Vercel
- Verify all required env vars are set
- Test build locally first

**Environment variables not working:**
- Must start with `NEXT_PUBLIC_` for client-side
- Redeploy after adding variables
- Check for typos (case-sensitive)

**Firebase errors:**
- Verify Firebase config values
- Check Firebase project is active
- Ensure Admin credentials are valid

---

## Brand Assets (Logo & Favicon)

Place your brand files in the `public/` folder:

| File | Location | Usage |
|------|----------|-------|
| Logo (SVG) | `public/logo.svg` | Header, marketing pages (logo should include the "Puncto" text) |
| Logo white (SVG) | `public/logo-white.svg` | Footer (dark background) – white/light version of your logo |
| Favicon | `public/favicon.ico` | Browser tab, bookmarks, PWA |

**Note:** The logo component displays only the image (no additional text), so your SVG should include the "Puncto" branding/text. For the footer on dark backgrounds, add `logo-white.svg` (light-colored version). If missing, it will fallback to `logo.svg`.

---

## Support Resources

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Firebase Setup: https://firebase.google.com/docs/web/setup
