# Puncto - Quick Start Guide

## 🚀 Getting Started with the New Authentication System

This guide will help you quickly test all three authentication flows in development.

---

## Step 1: Create Your Platform Admin Account

Run this command to create your admin account:

```bash
npm run create-admin
```

**Fill in the prompts:**
```
Email: admin@puncto.com.br
Name: Your Name
Password: YourSecurePassword123
Level: 1 (super_admin)
```

✅ **You now have platform admin access!**

---

## Step 2: Access Platform Admin Dashboard

**Development URL:**
```
http://localhost:3000?subdomain=admin
```

This will automatically redirect you to the platform admin login page at:
```
http://localhost:3000/auth/platform/login
```

**Login with:**
- Email: admin@puncto.com.br
- Password: YourSecurePassword123

✅ **You're now in the platform admin dashboard!**

**What you can do:**
- View all businesses
- Manage all users
- View platform analytics
- Manage subscriptions

---

## Step 3: Test Business Owner Flow (Optional)

### Create a Business Owner Account

1. **Visit business signup:**
   ```
   http://localhost:3000/auth/business/signup
   ```

2. **Fill in account details:**
   - Name: Test Business Owner
   - Email: owner@test.com
   - Password: TestOwner123
   - Accept terms

3. **Complete business onboarding:**
   - Business Name: My Test Salon
   - Legal Name: Test Salon LTDA
   - CPF/CNPJ: 12345678901
   - Industry: Salão de Beleza
   - Email: contact@testsalon.com
   - Phone: (11) 98765-4321

4. **Select a plan:**
   - Choose any plan (Starter, Growth, Pro)

5. **Complete payment:**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future date
   - Any CVC

6. **Access business admin:**
   ```
   http://localhost:3000?subdomain=my-test-salon/admin
   ```

✅ **Business owner account created!**

---

## Step 4: Test Customer Flow (Optional)

### Create a Customer Account

1. **Visit customer signup:**
   ```
   http://localhost:3000/auth/customer/signup
   ```

2. **Fill in details:**
   - Name: Test Customer
   - Email: customer@test.com
   - Password: TestCustomer123
   - Accept terms

3. **Access customer area:**
   - Book services at any business
   - View bookings at `/my-bookings`

✅ **Customer account created!**

---

## 🔐 Authentication URLs Reference

### Platform Admin (You)
- **Login:** `/auth/platform/login`
- **Access:** `http://localhost:3000?subdomain=admin`
- **Dashboard:** `/platform/dashboard`

### Business Owners
- **Signup:** `/auth/business/signup`
- **Login:** `/auth/business/login`
- **Dashboard:** `http://localhost:3000?subdomain={slug}/admin`

### Customers
- **Signup:** `/auth/customer/signup`
- **Login:** `/auth/customer/login`
- **Bookings:** `/my-bookings`

---

## ✅ Testing Checklist

Use this checklist to verify everything works:

- [ ] Created platform admin via `npm run create-admin`
- [ ] Logged in to platform admin dashboard
- [ ] Viewed businesses list
- [ ] Created test business owner account
- [ ] Completed business onboarding
- [ ] Accessed business admin dashboard
- [ ] Created test customer account
- [ ] Accessed customer booking page

---

## 🚨 Common Issues

### Can't Access Platform Admin
- **Problem:** Getting "Unauthorized" error
- **Solution:** Make sure you created the admin via `npm run create-admin` (not regular signup)

### Business Owner Stuck on Payment
- **Problem:** Business not activating after payment
- **Solution:** Check Stripe webhook is configured correctly for local development

### Wrong Login Page
- **Problem:** Redirected to wrong login page
- **Solution:** Use the correct login URL for your user type (see URLs above)

---

## 📚 Next Steps

- Read the full [AUTHENTICATION_GUIDE.md](AUTHENTICATION_GUIDE.md) for detailed information
- Check [README.md](README.md) for overall platform documentation
- Explore the platform admin features
- Set up additional businesses for testing

---

## 🎉 You're Ready!

You now have:
✅ Platform admin access for managing the entire platform
✅ Separate authentication flows for each user type
✅ Secure role-based access control
✅ Self-service business onboarding

Happy building! 🚀
