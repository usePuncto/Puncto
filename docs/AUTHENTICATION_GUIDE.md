# Puncto Authentication Guide

## Overview

Puncto uses a **role-segregated authentication system** with completely separate signup and login flows for three distinct user types:

1. **Platform Admins** - Internal Puncto team members
2. **Business Owners** - Customers who manage businesses
3. **Customers** - End users who book services

This guide explains how each authentication flow works and how to use them.

---

## 🏗️ Architecture

### Three Separate Authentication Flows

```
┌─────────────────────────────────────────────────────────────┐
│                  AUTHENTICATION SYSTEM                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┬────────────────────┬────────────────────┐
│ Platform Admin   │ Business Owner     │ Customer           │
├──────────────────┼────────────────────┼────────────────────┤
│ Manual Creation  │ Self-Service       │ Self-Service       │
│ (Script Only)    │ Signup + Onboard   │ Signup Only        │
└──────────────────┴────────────────────┴────────────────────┘
```

### Directory Structure

```
src/app/auth/
├── platform/
│   └── login/page.tsx          # Platform admin login
├── business/
│   ├── signup/page.tsx         # Business owner signup
│   └── login/page.tsx          # Business owner login
└── customer/
    ├── signup/page.tsx         # Customer signup
    └── login/page.tsx          # Customer login
```

---

## 1️⃣ Platform Admin Authentication

### For: Internal Puncto team members only

### Creation Process (Manual)

Platform admins **cannot sign up** through the website. They must be created manually using the admin script.

**Command:**
```bash
npm run create-admin
```

**Interactive Prompts:**
```
🔐 Criar Administrador da Plataforma Puncto

Email do administrador: admin@puncto.com.br
Nome completo: Admin Name
Senha (mínimo 6 caracteres): ********

Níveis de acesso disponíveis:
1. super_admin - Acesso total
2. support - Suporte ao cliente
3. analyst - Analista (somente leitura)

Escolha o nível (1-3) [padrão: 3]: 1

📋 Resumo:
Email: admin@puncto.com.br
Nome: Admin Name
Nível: super_admin

Confirmar criação? (s/n): s

✅ Administrador criado com sucesso!
```

### Login

**URL (Development):**
```
http://localhost:3000?subdomain=admin
```
Then navigate to `/auth/platform/login` or it will auto-redirect.

**URL (Production):**
```
https://admin.puncto.com.br
```

**Page:** [/auth/platform/login](src/app/auth/platform/login/page.tsx)

**Validation:**
- Requires `customClaims.platformAdmin === true`
- Requires `customClaims.userType === 'platform_admin'`
- Redirects to `/platform/dashboard` on success

**Features:**
- Dark theme (visually distinct from business/customer logins)
- Security warning message
- No "forgot password" link (manual reset required)
- No social login options
- Enhanced security checks

### Custom Claims Structure

```typescript
{
  userType: 'platform_admin',
  platformAdmin: true,
  platformRole: 'super_admin' | 'support' | 'analyst'
}
```

### Access Level

- **super_admin**: Full platform access, can modify all businesses
- **support**: Can view all businesses, limited modification rights
- **analyst**: Read-only access to analytics and reports

---

## 2️⃣ Business Owner Authentication

### For: Business owners and managers

### Signup Flow

**URL:** `/auth/business/signup`

**Page:** [/auth/business/signup/page.tsx](src/app/auth/business/signup/page.tsx)

**Process:**
```
1. Account Creation
   ├── Name, Email, Password
   ├── Terms & Privacy acceptance
   └── Automatic redirect to onboarding

2. Business Information (/onboarding/business)
   ├── Business Name, Legal Name
   ├── CPF/CNPJ
   ├── Industry selection
   └── Contact details

3. Plan Selection (/onboarding/plan)
   ├── Choose subscription tier
   ├── Create business (status: pending_payment)
   └── Redirect to Stripe Checkout

4. Payment (Stripe)
   ├── PIX or Card payment
   └── Webhook activates business

5. Auto-Assignment (via API)
   ├── userType: 'business_user'
   ├── businessRoles: {businessId: 'owner'}
   └── primaryBusinessId: businessId
```

### Login

**URL:** `/auth/business/login`

**Page:** [/auth/business/login/page.tsx](src/app/auth/business/login/page.tsx)

**Validation:**
- Requires `customClaims.userType === 'business_user'`
- Redirects to business admin dashboard on success
- Shows error if account is not a business account

**Features:**
- Blue gradient theme
- "Forgot password" link
- "Remember me" checkbox
- Link to customer login (for users who need to switch)
- Link to business signup

### Custom Claims Structure

```typescript
{
  userType: 'business_user',
  businessRoles: {
    'business-id-123': 'owner',    // Can have multiple businesses
    'business-id-456': 'manager'
  },
  primaryBusinessId: 'business-id-123'
}
```

### Roles

- **owner**: Full access to all business features
- **manager**: Configurable permissions (defined in business settings)
- **professional**: Limited access (mainly bookings and schedule)

---

## 3️⃣ Customer Authentication

### For: End users who book services

### Signup Flow

**URL:** `/auth/customer/signup`

**Page:** [/auth/customer/signup/page.tsx](src/app/auth/customer/signup/page.tsx)

**Process:**
```
1. Quick Account Creation
   ├── Name, Email, Password
   ├── Terms & Privacy acceptance
   └── Redirect to booking/profile

No onboarding required - customers are ready immediately!
```

### Login

**URL:** `/auth/customer/login`

**Page:** [/auth/customer/login/page.tsx](src/app/auth/customer/login/page.tsx)

**Validation:**
- Any authenticated user can log in
- No specific userType required (customers, business users can both access customer features)

**Features:**
- Clean, simple interface
- "Forgot password" link
- Social login options (Google, Facebook)
- "Continue as guest" option
- Link to business signup (for customers who want to become business owners)

### Custom Claims Structure

```typescript
{
  userType: 'customer',
  customerId: 'user-uid-here'
}
```

---

## 🔒 Security Enforcement

### Middleware Protection

**File:** [middleware.ts](middleware.ts)

#### Platform Admin Routes

```typescript
if (subdomain === 'admin') {
  if (!hasAuthCookie) {
    // Redirect to platform admin login
    return redirect('/auth/platform/login');
  }

  if (!isPlatformAdmin(customClaims)) {
    // Not a platform admin -> unauthorized
    return redirect('/unauthorized?reason=platform_admin_required');
  }
}
```

#### Business Admin Routes

```typescript
if (url.pathname.startsWith('/admin')) {
  if (!hasAuthCookie) {
    // Redirect to business login
    return redirect('/auth/business/login');
  }

  if (!hasBusinessAccess(customClaims, businessId)) {
    // Customer or unauthorized business user
    return redirect('/unauthorized?reason=business_admin_required');
  }
}
```

#### Customer Routes

```typescript
if (url.pathname.startsWith('/my-bookings')) {
  if (!hasAuthCookie) {
    // Redirect to customer login
    return redirect('/auth/customer/login');
  }
}
```

### Middleware Utility Functions

**File:** [src/lib/auth/middleware-utils.ts](src/lib/auth/middleware-utils.ts)

```typescript
// Check if user is platform admin
isPlatformAdmin(claims: CustomClaims): boolean

// Check if user has access to specific business
hasBusinessAccess(claims: CustomClaims, businessId: string): boolean
```

---

## 🛣️ Routing Summary

| User Type | Signup URL | Login URL | Redirect After Login |
|-----------|-----------|-----------|---------------------|
| **Platform Admin** | Manual script only | `/auth/platform/login` | `/platform/dashboard` |
| **Business Owner** | `/auth/business/signup` | `/auth/business/login` | `/{slug}/admin/dashboard` |
| **Customer** | `/auth/customer/signup` | `/auth/customer/login` | Booking page or `/my-bookings` |

### Development Access

| User Type | Local URL | Production URL |
|-----------|-----------|----------------|
| **Platform Admin** | `http://localhost:3000?subdomain=admin` | `https://admin.puncto.com.br` |
| **Business Owner** | `http://localhost:3000?subdomain={slug}` | `https://{slug}.puncto.com.br` |
| **Customer** | `http://localhost:3000?subdomain={slug}` | `https://{slug}.puncto.com.br` |

---

## 🧪 Testing Authentication Flows

### 1. Test Platform Admin Creation

```bash
# Create platform admin
npm run create-admin

# Enter test credentials
Email: test-admin@puncto.test
Name: Test Admin
Password: TestAdmin123
Level: 1 (super_admin)

# Login at
http://localhost:3000?subdomain=admin
```

### 2. Test Business Owner Signup

```
1. Visit: http://localhost:3000/auth/business/signup
2. Create account
3. Complete onboarding (business info)
4. Select plan
5. Complete payment (use Stripe test card: 4242 4242 4242 4242)
6. Verify userType changed to 'business_user'
7. Access business admin at: http://localhost:3000?subdomain={your-slug}/admin
```

### 3. Test Customer Signup

```
1. Visit: http://localhost:3000/auth/customer/signup
2. Create account
3. Immediately redirected (no onboarding)
4. Can access bookings or continue as guest
```

### 4. Test Access Control

```bash
# Try accessing platform admin as business user (should fail)
1. Login as business user
2. Navigate to: http://localhost:3000?subdomain=admin
3. Should redirect to /unauthorized

# Try accessing business admin as customer (should fail)
1. Login as customer
2. Navigate to: http://localhost:3000?subdomain=salon-a/admin
3. Should redirect to /unauthorized
```

---

## 📝 Important Notes

### User Type Assignment

- **Platform Admins**: Created via `npm run create-admin` script only
- **Business Owners**: Auto-assigned `business_user` type during onboarding payment completion
- **Customers**: Default type for all signups that don't complete business onboarding

### Custom Claims Hygiene

The system automatically removes incompatible claims when assigning user types:

```typescript
// Business user claims CANNOT have platformAdmin
// Platform admin claims CANNOT have businessRoles
// Customer claims CANNOT have platformAdmin or businessRoles
```

### Onboarding Flow

Business owners MUST complete the full onboarding flow:
1. Signup → 2. Business Info → 3. Plan Selection → 4. Payment

Only after successful payment does the system assign `business_user` type.

### No Unified Login

There is **NO** `/auth/login` or `/auth/signup` route. Each user type has its own dedicated authentication pages to prevent confusion and ensure security.

---

## 🔧 Maintenance

### Adding a New Platform Admin

```bash
npm run create-admin
```

### Upgrading Existing User to Platform Admin

```bash
npm run set-admin email@example.com
```

User must sign out and sign back in for changes to take effect.

### Removing Platform Admin Access

```bash
npm run set-admin email@example.com
# Choose "remove admin access" when prompted
```

---

## 🚨 Troubleshooting

### "Unauthorized" Error

**Symptom:** User sees "Unauthorized" page when trying to access platform/business admin

**Solutions:**
1. Verify user has correct `userType` in custom claims
2. Check that user signed out and back in after role change
3. Verify business role exists in `businessRoles` object
4. Check middleware logs for rejection reason

### User Can't Access Business Admin

**Symptom:** Business owner gets redirected when accessing `/admin`

**Solutions:**
1. Verify onboarding payment completed successfully
2. Check Stripe webhook was processed
3. Verify `businessRoles` contains the business ID
4. Check that `userType === 'business_user'`

### Platform Admin Login Fails

**Symptom:** Admin sees "Access denied" message

**Solutions:**
1. Verify `platformAdmin === true` in custom claims
2. Verify `userType === 'platform_admin'`
3. Check admin was created with `npm run create-admin`
4. Try signing out and back in

---

## 📚 Related Files

- **Middleware**: [middleware.ts](middleware.ts)
- **Middleware Utils**: [src/lib/auth/middleware-utils.ts](src/lib/auth/middleware-utils.ts)
- **User Creation**: [src/lib/auth/create-user.ts](src/lib/auth/create-user.ts)
- **Onboarding API**: [src/app/api/onboarding/create-business/route.ts](src/app/api/onboarding/create-business/route.ts)
- **User Types**: [src/types/user.ts](src/types/user.ts)
- **Create Admin Script**: [scripts/create-platform-admin.ts](scripts/create-platform-admin.ts)
- **Set Admin Script**: [scripts/set-admin.ts](scripts/set-admin.ts)

---

## ✅ Summary

✨ **Three completely separate authentication flows**
🔒 **Multi-layer security enforcement** (Middleware + Layout + API)
🎯 **Role-based access control** with custom claims
🚀 **Self-service business onboarding** (no manual intervention)
🛡️ **Platform admin security** (manual creation only)
📱 **Customer-friendly signup** (quick and simple)

The system ensures that:
- Customers cannot access business admin areas
- Business owners cannot access platform admin areas
- Business owners cannot access other businesses' admin areas
- Platform admins have full access to everything (when needed)
