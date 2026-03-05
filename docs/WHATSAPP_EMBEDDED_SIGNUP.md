# Meta WhatsApp Embedded Signup Setup

Each business connects their own WhatsApp number so automated messages are sent from their number to their clients. All credentials are stored server-side only.

## Prerequisites

1. **Become a Meta Tech Provider**  
   Apply at [Meta for Developers](https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers/).

2. **Create a Meta App**  
   - Add WhatsApp product
   - Configure Embedded Signup and create a **config_id**

## Environment Variables

Add to `.env.local`:

```env
# Meta App (required for Embedded Signup)
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret

# Embedded Signup config ID (from Meta App Dashboard > WhatsApp > Embedded Signup)
NEXT_PUBLIC_META_APP_ID=your_app_id
NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID=your_config_id

# Optional: redirect_uri for token exchange (only if Meta requires it)
META_WHATSAPP_REDIRECT_URI=
```

## Firestore

A collection `business_whatsapp_credentials` stores per-business credentials. It is only accessed by server-side API routes—never by the client.

## Flow

1. Business (Growth/Pro tier) goes to **WhatsApp** page
2. Clicks **Connect WhatsApp** → Meta Embedded Signup (FB.login with config_id)
3. User completes flow → authorization code is returned
4. Frontend POSTs code to `/api/whatsapp/connect`
5. Backend exchanges code for access token, fetches WABA + phone number, stores in Firestore
6. `sendWhatsApp({ businessId, ... })` uses stored credentials for that business

## Fallback (Single Number)

If no `businessId` is passed to `sendWhatsApp`, it uses env vars:

```env
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
```

Use this for Puncto’s own support number or before Embedded Signup is configured.
