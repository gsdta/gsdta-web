# Monitoring & Alerting Setup

**Part 10 of GSDTA Infrastructure Setup**  
**Time Required**: ~15 minutes  
**Prerequisites**: Parts 1-9 completed

---

## 🎯 Overview

This guide covers:
- Setting up Cloud Monitoring
- Configuring log-based alerts
- Setting up uptime checks
- Configuring notification channels
- Creating dashboards

---

## 📋 Prerequisites

```bash
# Load environment variables
source ~/.gsdta-env

# Verify service is deployed
gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID
```

---

## 1. Set Up Uptime Check

```bash
# Create uptime check
gcloud monitoring uptime create https-$SERVICE_NAME \
  --resource-type=uptime-url \
  --check-http-url="$SERVICE_URL/api/v1/health" \
  --project=$PROJECT_ID

# Expected output:
# Created uptime check [https-gsdta-web].
```

### Verify Uptime Check

```bash
# List uptime checks
gcloud monitoring uptime list --project=$PROJECT_ID

# Get details
gcloud monitoring uptime describe https-$SERVICE_NAME --project=$PROJECT_ID
```

---

## 2. Create Notification Channel

**⚠️ Manual step in Cloud Console**

1. Go to: https://console.cloud.google.com/monitoring/alerting/notifications
2. Click: **Add new**
3. Select: **Email**
4. Enter: admin@gsdta.com
5. Click: **Save**

---

## 3. Create Alert Policies

### Error Rate Alert

```bash
# Create alert for high error rate
# This requires Cloud Console for complex configuration

# Open alerts page
open "https://console.cloud.google.com/monitoring/alerting/policies/create?project=$PROJECT_ID"

# Configure:
# - Metric: Cloud Run - Request count (filter: response_code_class="5xx")
# - Condition: > 10 errors in 5 minutes
# - Notification: Email channel created above
```

---

## 4. Create Dashboard

**⚠️ Manual step in Cloud Console**

1. Go to: https://console.cloud.google.com/monitoring/dashboards
2. Click: **Create Dashboard**
3. Name: "GSDTA Production Monitoring"
4. Add charts:
   - Request count
   - Request latency
   - Error rate
   - CPU utilization
   - Memory utilization

---

## 5. Verification Checklist

```bash
# 1. Uptime check exists
gcloud monitoring uptime list --project=$PROJECT_ID | grep -q $SERVICE_NAME && \
  echo "✅ Uptime check configured" || echo "❌ Uptime check missing"

# 2. Notification channels exist
gcloud alpha monitoring channels list --project=$PROJECT_ID | grep -q email && \
  echo "✅ Notification channel configured" || echo "⏭️  Configure in console"
```

---

## 6. Setup Summary

```
✅ Monitoring Configured
   - Uptime check: /api/v1/health
   - Frequency: Every 60 seconds
   - Notification: Email

✅ Alerting Configured
   - Error rate alert: > 10 errors/5min
   - Downtime alert: Service unavailable
   - Notification: admin@gsdta.com

✅ Dashboard Created
   - Metrics: Requests, latency, errors
   - Resource: CPU, memory
   - Custom: Business metrics
```

---

## 📚 Final Steps

✅ Complete infrastructure setup finished!

Review: [00-MASTER-SETUP.md](./00-MASTER-SETUP.md) for final verification checklist.

---

**Completion Time**: ~15 minutes  
**Status**: All infrastructure guides complete! 🎉
