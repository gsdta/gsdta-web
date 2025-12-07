# 🌐 Website Reputation, Security & SEO Verification Guide
### (for gsdta.org / app.gsdta.com / gsdta.com)

_Last updated: 2025-10-15_

This document outlines how to **verify, secure, and maintain reputation** for GSDTA web properties across major security and SEO verification platforms — McAfee, Google, Norton, Cisco Talos, and Google Search Console.

---

## ✅ What “Safe / Verified” Means
Security and reputation systems rate domains based on:
- HTTPS certificate trust and renewal
- Malware or phishing content presence
- DNS stability and WHOIS consistency
- Domain age and activity
- User trust signals and complaint data
- Links from reputable domains

| Symbol | Meaning |
|--------|----------|
| ✅ Green | Safe (no malicious indicators) |
| ⚠️ Yellow | Limited data / minor risk indicators |
| ❌ Red | Unsafe / blacklisted |
| ❓ Gray | Not yet rated |

---

## 🧭 1. McAfee (WebAdvisor / TrustedSource)

**Portal:** [https://trustedsource.org](https://trustedsource.org)

**Steps to check or request verification:**
1. Visit **TrustedSource → Check Single URL**
2. Enter your domain, e.g. `https://www.gsdta.org`
3. Review the rating (Safe / Unknown / Unverified)
4. If needed, click **Request Review**
5. Provide details:
    - **Organization:** Greater San Diego Tamil Academy
    - **Category:** Education / Non-Profit
    - **Purpose:** Tamil language education and community outreach

⏱ Review time: 2–5 business days

**Note:** The status “Unknown” simply means McAfee hasn’t crawled your new domain/subdomain yet. Once crawled, it usually auto-verifies as “Safe.”

---

## 🧭 2. Google Safe Browsing

**Portal:** [https://transparencyreport.google.com/safe-browsing/search](https://transparencyreport.google.com/safe-browsing/search)

Google automatically evaluates:
- Malware / phishing indicators
- HTTPS and HSTS compliance
- SSL certificate chain trust

✅ You don’t need to manually submit for Safe Browsing — it updates as your site becomes indexed and passes Googlebot checks.

---

## 🧭 3. Norton Safe Web

**Portal:** [https://safeweb.norton.com/](https://safeweb.norton.com/)

**Steps:**
1. Enter your domain (`gsdta.org`)
2. Review the safety status
3. If it shows **“Unrated”**, click **“Submit site for evaluation”**
4. Provide educational / non-profit context

---

## 🧭 4. Cisco Talos Reputation Center

**Portal:** [https://talosintelligence.com/reputation_center](https://talosintelligence.com/reputation_center)

**Steps:**
1. Enter `gsdta.org` or `app.gsdta.com`
2. Review status: “Good,” “Neutral,” or “Poor”
3. If inaccurate, click **Request Evaluation** and describe your site’s purpose

---

## 🛡️ 5. Best Practices to Maintain a Positive Reputation

| Area | Action |
|------|--------|
| **SSL / HTTPS** | Always use valid certificates (CloudFront, GCP-managed SSL) |
| **DNS Stability** | Keep SOA, NS, and MX records consistent in Route 53 |
| **Uptime** | Maintain reliable backend (Cloud Run, CloudFront) |
| **Transparency** | Keep contact info visible (`communications@gsdta.org`) |
| **Content Quality** | Avoid broken links, ads, or malicious JS |
| **Age & Stability** | Keep domain renewals active (longer registration = higher trust) |
| **Redirect Integrity** | Only use HTTPS 301 redirects; no masked forwarding |

---

## 🧩 6. SEO & Google Search Console Verification

To improve visibility and SEO health tracking for GSDTA:

### 1️⃣ Add GSDTA to Google Search Console
**Link:** [https://search.google.com/search-console](https://search.google.com/search-console)

**Steps:**
1. Log in with your `gsdta.aws@gmail.com` account (or domain admin)
2. Click **“Add property”**
3. Choose **Domain Property**
4. Enter: `gsdta.org`
5. Google will provide a **TXT record** for DNS verification (example):

