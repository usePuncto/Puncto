# WhatsApp Webhook Setup with ngrok

This guide explains how to receive incoming WhatsApp messages on your local development environment using ngrok. With this setup, messages sent to your business number will appear in the platform admin dashboard, and you can reply directly.

---

## Prerequisites

- WhatsApp Business API configured (phone number, access token in `.env.local`)
- Platform admin account
- Your Next.js dev server running on port 3000

---

## Step 1: Install ngrok

### Option A: Official binary (recommended for Windows)

1. Go to [ngrok.com/download](https://ngrok.com/download)
2. Download **Windows (64-bit)**
3. Unzip and place `ngrok.exe` in a folder (e.g. `C:\ngrok\`)
4. (Optional) Add the folder to your PATH

### Option B: npm (macOS/Linux)

```bash
npm install -g ngrok
```

---

## Step 2: Configure ngrok (first time only)

1. Sign up at [ngrok.com](https://ngrok.com)
2. Copy your authtoken from [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Run:

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

---

## Step 3: Start your dev server

In one terminal, start the Next.js app:

```bash
npm run dev
```

Keep this running. The app must be available on `http://localhost:3000`.

---

## Step 4: Start ngrok

In a **second terminal**, run:

```bash
ngrok http 3000
```

You should see output like:

```
Session Status                online
Forwarding                    https://xxxx-xxxx.ngrok-free.app -> http://localhost:3000
Web Interface                 http://127.0.0.1:4040
```

**Important:** Copy the `https://xxxx-xxxx.ngrok-free.app` URL. This is your public URL for the webhook. Keep this terminal open—ngrok must stay running to receive messages.

---

## Step 5: Configure Meta webhook

1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App → **WhatsApp** → **Configuration**
2. In the **Webhook** section, click **Edit**
3. Set:
   - **Callback URL:** `https://YOUR-NGROK-URL/api/whatsapp/webhook`  
     Example: `https://a08b-2804-14c-878d-8496-c425-1a10-c6f8-badc.ngrok-free.app/api/whatsapp/webhook`
   - **Verify token:** Same value as `WHATSAPP_VERIFY_TOKEN` in your `.env.local`
4. Click **Verify and Save**
5. Ensure **messages** is subscribed under Webhook fields

---

## Step 6: View and reply to messages

1. Open the platform admin dashboard:  
   `http://localhost:3000/platform/whatsapp`  
   (Log in as platform admin if needed.)

2. Have someone send a message to your business number from their WhatsApp.

3. In the dashboard:
   - Click **Refresh** in the contacts list
   - The conversation should appear
   - Select it to see the message thread

4. To reply: type your message and click **Send**.  
   (The recipient must have messaged you within the last 24 hours for free-form replies to work.)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook verification fails | Ensure `WHATSAPP_VERIFY_TOKEN` in `.env.local` matches the value in Meta |
| No messages appearing | Click **Refresh**; ensure ngrok and the dev server are running |
| ngrok URL changes | Each ngrok restart gives a new URL—update the webhook in Meta |
| "Not on WhatsApp yet" | Wait 24–48 hours after registering; check number status in Meta |
| Can't send (template error) | Recipient must message you first; free-form text works within 24h of their last message |

---

## Quick reference

**Start development session:**
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
```

**Webhook URL format:**
```
https://YOUR-NGROK-URL/api/whatsapp/webhook
```

**Platform WhatsApp dashboard:**
```
http://localhost:3000/platform/whatsapp
```
