# Firebase Authentication Setup

**Part 3 of GSDTA Infrastructure Setup**  
**Time Required**: ~20 minutes (includes manual console steps)  
**Prerequisites**: Parts 1-2 completed

---

## 🎯 Overview

This guide covers:
- Creating Firebase web app
- Configuring authentication providers
- Setting authorized domains
- Getting Firebase SDK configuration
- Saving configuration for Secret Manager

---

## 📋 Prerequisites

```bash
# Verify Firebase project is set
firebase use
# Should show: Active Project: your-project-id

# Load environment variables
source ~/.gsdta-env

# Verify
echo "PROJECT_ID: $PROJECT_ID"
```

---

## 1. Create Firebase Web App

```bash
# Create web application
firebase apps:create web "GSDTA Web UI" --project $PROJECT_ID

# Expected output:
# ✔ Creating your Web app
# 
# 🎉🎉🎉 Your Firebase Web App is ready! 🎉��🎉
# 
# App information:
#   - App ID: 1:123456789:web:abcdef...
#   - Display name: GSDTA Web UI
```

### Get Web App ID

```bash
# List all apps
firebase apps:list --project $PROJECT_ID

# Expected output (copy the Web App ID):
# ┌──────────────────┬──────────────────────┬────────────┬──────────┐
# │ App Display Name │ App ID               │ Platform   │ Resource │
# ├──────────────────┼──────────────────────┼────────────┼──────────┤
# │ GSDTA Web UI     │ 1:123456789:web:abc  │ WEB        │          │
# └──────────────────┴──────────────────────┴────────────┴──────────┘

# Save Web App ID
export WEB_APP_ID="1:123456789:web:abcdef"  # CHANGE THIS to your App ID
echo "WEB_APP_ID=$WEB_APP_ID"
```

### Get Firebase SDK Configuration

```bash
# Get SDK config
firebase apps:sdkconfig web $WEB_APP_ID --project $PROJECT_ID

# Expected output (JSON):
# {
#   "projectId": "gsdta-nonprofit-prod",
#   "appId": "1:123456789:web:abcdef",
#   "storageBucket": "gsdta-nonprofit-prod.appspot.com",
#   "apiKey": "AIzaSy...",
#   "authDomain": "gsdta-nonprofit-prod.firebaseapp.com",
#   "messagingSenderId": "123456789"
# }

# Save to file for reference
firebase apps:sdkconfig web $WEB_APP_ID --project $PROJECT_ID > /tmp/firebase-config.json

# Display config
cat /tmp/firebase-config.json | jq '.'

# Extract individual values (you'll need these for Secret Manager)
export FIREBASE_API_KEY=$(cat /tmp/firebase-config.json | jq -r '.apiKey')
export FIREBASE_AUTH_DOMAIN=$(cat /tmp/firebase-config.json | jq -r '.authDomain')
export FIREBASE_PROJECT_ID=$(cat /tmp/firebase-config.json | jq -r '.projectId')
export FIREBASE_APP_ID=$(cat /tmp/firebase-config.json | jq -r '.appId')

echo "FIREBASE_API_KEY: $FIREBASE_API_KEY"
echo "FIREBASE_AUTH_DOMAIN: $FIREBASE_AUTH_DOMAIN"
echo "FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID"
echo "FIREBASE_APP_ID: $FIREBASE_APP_ID"

# Save these to environment file
cat >> ~/.gsdta-env << ENVEOF

# Firebase Configuration
export FIREBASE_API_KEY="$FIREBASE_API_KEY"
export FIREBASE_AUTH_DOMAIN="$FIREBASE_AUTH_DOMAIN"
export FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID"
export FIREBASE_APP_ID="$FIREBASE_APP_ID"
ENVEOF
```

---

## 2. Configure Authentication Providers

**⚠️ These steps must be done in Firebase Console (GUI)**

### Open Firebase Console

```bash
# Open Firebase Console
open "https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"

# Or navigate manually:
# 1. Go to: https://console.firebase.google.com
# 2. Select your project
# 3. Click "Authentication" in left sidebar
# 4. Click "Sign-in method" tab
```

### Enable Email/Password Authentication

1. In **Sign-in providers** section, find **Email/Password**
2. Click on it
3. Toggle **Enable** to ON
4. Click **Save**

**Verification**:
- Email/Password row should show: ✅ Enabled

### Enable Google Authentication

1. In **Sign-in providers** section, find **Google**
2. Click on it
3. Toggle **Enable** to ON
4. Set **Public-facing name**: "GSDTA Tamil School"
5. Set **Support email**: your-admin@gsdta.com
6. Click **Save**

**Verification**:
- Google row should show: ✅ Enabled

---

## 3. Configure Authorized Domains

**⚠️ Must be done in Firebase Console**

### Add Authorized Domains

```bash
# Open authorized domains settings
open "https://console.firebase.google.com/project/$PROJECT_ID/authentication/settings"

# Or navigate: Authentication → Settings → Authorized domains
```

Add these domains:

1. **localhost** (for local development)
   - Already added by default ✅

2. **Your Cloud Run URL** (will get this after deployment)
   - Format: `gsdta-web-PROJECT_HASH-uc.a.run.app`
   - Add this after Part 7 (Cloud Run deployment)

3. **Custom domain** (production)
   - `app.gsdta.com`
   - Add this after Part 8 (Custom domain setup)

**For now**, just verify `localhost` is present.

---

## 4. Verification Checklist

```bash
# 1. Web app exists
firebase apps:list --project $PROJECT_ID | grep "GSDTA Web UI"
# Should show: GSDTA Web UI | 1:...:web:... | WEB

# 2. Config saved
test -f /tmp/firebase-config.json && echo "✅ Config file exists" || echo "❌ Config file missing"

# 3. Environment variables set
test -n "$FIREBASE_API_KEY" && echo "✅ API Key set" || echo "❌ API Key missing"
test -n "$FIREBASE_AUTH_DOMAIN" && echo "✅ Auth Domain set" || echo "❌ Auth Domain missing"
test -n "$FIREBASE_APP_ID" && echo "✅ App ID set" || echo "❌ App ID missing"

# 4. Verify in console (manual)
echo "Verify in Firebase Console:"
echo "  ✓ Email/Password provider enabled"
echo "  ✓ Google provider enabled"
echo "  ✓ localhost in authorized domains"
```

---

## 5. Configuration Summary

After completing this guide:

```
✅ Firebase Web App Created
   - App Name: GSDTA Web UI
   - App ID: 1:123456789:web:abcdef
   - Platform: WEB

✅ SDK Configuration Retrieved
   - API Key: AIzaSy...
   - Auth Domain: project-id.firebaseapp.com
   - Project ID: gsdta-nonprofit-prod
   - App ID: 1:123456789:web:abcdef

✅ Authentication Providers Enabled
   - Email/Password: ✅
   - Google: ✅

✅ Authorized Domains
   - localhost: ✅ (default)
   - Cloud Run URL: ⏳ (add after deployment)
   - Custom domain: ⏳ (add after domain setup)

✅ Environment Variables Saved
   - Saved to: ~/.gsdta-env
   - FIREBASE_API_KEY
   - FIREBASE_AUTH_DOMAIN
   - FIREBASE_PROJECT_ID
   - FIREBASE_APP_ID
```

---

## 🔧 Troubleshooting

### Issue: App Creation Fails

```bash
# Error: Failed to create web app
# Solution: Verify Firebase is properly added
firebase projects:list | grep $PROJECT_ID

# If not listed:
firebase projects:addfirebase $PROJECT_ID
# Wait 2 minutes, then retry
```

### Issue: Can't Get SDK Config

```bash
# Error: App not found
# Solution: List apps to get correct App ID
firebase apps:list --project $PROJECT_ID

# Copy the correct App ID and retry
export WEB_APP_ID="1:CORRECT:web:ID"
firebase apps:sdkconfig web $WEB_APP_ID --project $PROJECT_ID
```

### Issue: jq Command Not Found

```bash
# Error: jq: command not found
# Solution: Install jq
# macOS:
brew install jq

# Linux (Ubuntu/Debian):
sudo apt-get install jq

# Or extract manually:
cat /tmp/firebase-config.json
# Copy values manually
```

### Issue: Auth Providers Not Showing

```bash
# Solution: Clear browser cache and reload
# Or open in incognito mode:
open -a "Google Chrome" --args --incognito \
  "https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
```

---

## 📚 Next Steps

✅ Firebase Authentication is now configured!

**Important**: You'll need to add more authorized domains later:
- After Part 7 (Cloud Run): Add Cloud Run URL
- After Part 8 (Custom Domain): Add app.gsdta.com

**Next**: [04-service-accounts-iam.md](./04-service-accounts-iam.md) - Set up service accounts

---

## 🔗 Related Documentation

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Authorized Domains](https://firebase.google.com/docs/auth/web/redirect-best-practices#customize-domains)
- [00-MASTER-SETUP.md](./00-MASTER-SETUP.md) - Master setup guide

---

**Completion Time**: ~20 minutes  
**Next Guide**: Service Accounts & IAM Setup
