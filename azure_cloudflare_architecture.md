# Azure + Cloudflare Architecture — Student Record Management App

> **Subscription context:** Azure for Students ($100 credit). Azure Front Door is **blocked** by the platform. This guide uses Cloudflare (free/pro) as the CDN + WAF layer instead.

> **Database:** Your backend uses the `mssql` npm driver with T-SQL syntax (`IDENTITY`, `NVARCHAR`, `OUTPUT INSERTED`, `sys.foreign_keys`). The correct Azure database is **Azure SQL Database** — not PostgreSQL. Zero code changes required.

---

## 1. High-Level Architecture

```
                        ┌──────────────────────────────────────────────────────────────┐
                        │                     CLOUDFLARE EDGE                          │
  USER (Browser)        │                                                              │
       │                │  ┌───────────────┐    ┌─────────────────────────────────┐   │
       │  HTTPS         │  │   CDN Cache   │    │          WAF Engine              │   │
       └───────────────►│  │ (Static files)│    │  - OWASP Core Ruleset (Pro)     │   │
                        │  │               │    │  - Custom Rules                  │   │
                        │  └──────┬────────┘    │  - Bot Protection                │   │
                        │         │              │  - Custom Block Page (403)      │   │
                        │         │              └───────────────┬─────────────────┘   │
                        └─────────┼──────────────────────────── ┼─────────────────────┘
                                  │                              │
               ┌──────────────────┘                             │
               │  Serve static JS/CSS/HTML                      │  Browser makes direct
               │  from CDN edge cache                           │  API calls /api/* 
               ▼  (React SPA runs in browser)                   │  (SPA pattern — no SSR)
  ┌─────────────────────────┐              ┌────────────────────▼───────────────────┐
  │  Azure Static Web Apps   │              │          Azure App Service              │
  │  (Frontend - React/Vite) │              │  (Backend - Node.js + mssql driver)    │
  │                          │              │                                         │
  │  - Free tier             │              │  CORS: allows only SWA custom domain   │
  │  - Built-in global CDN   │              │  Access Restrictions:                   │
  │  - Custom domain + HTTPS │              │    ALLOW Cloudflare IPv4/IPv6 only      │
  │  - GitHub Actions CI/CD  │              │    DENY all other sources               │
  └─────────────────────────┘              └────────────────┬────────────────────────┘
                                                            │  VNet Integration
                                                            │  (Regional)
                                           ┌────────────────▼────────────────────────┐
                                           │           Azure Virtual Network           │
                                           │                                           │
                                           │  ┌─────────────────────────────────────┐ │
                                           │  │  App Service Subnet  (10.0.1.0/24)  │ │
                                           │  └──────────────┬──────────────────────┘ │
                                           │                  │ Port 1433 (TDS) only   │
                                           │  ┌──────────────▼──────────────────────┐ │
                                           │  │  Azure SQL Database                 │ │
                                           │  │  (Private Endpoint / VNet SvcEndpt) │ │
                                           │  │  T-SQL compatible — zero code change│ │
                                           │  │  NSG: Allow 1433 from App Svc only  │ │
                                           │  │       Deny All else                 │ │
                                           │  └─────────────────────────────────────┘ │
                                           └───────────────────────────────────────────┘
```

---

## 2. Service Selection Rationale

| Layer | Service Chosen | Why |
|---|---|---|
| **CDN + WAF** | **Cloudflare** (Free/Pro) | Front Door blocked on student sub; Cloudflare has global PoPs, free SSL, WAF |
| **Frontend** | **Azure Static Web Apps** (Free tier) | Built-in CDN, free SSL, GitHub CI/CD integration, free tier available |
| **Backend** | **Azure App Service** (B1 tier) | Supports VNet integration, IP restrictions, ~$13/mo from $100 credit |
| **Database** | **Azure SQL Database** (Serverless / General Purpose) | Your backend uses `mssql` driver + T-SQL — Azure SQL is MSSQL in the cloud; **zero code changes** needed. `database_setup.sql` runs as-is. |

> ⚠️ **Why NOT PostgreSQL?** Your `package.json` uses `mssql@11`, `db.js` uses `sql.NVarChar`/`sql.Int` type constants, `studentModel.js` uses `OUTPUT INSERTED.id` (T-SQL only), and `database_setup.sql` uses `IDENTITY(1,1)`, `NVARCHAR`, `DATETIME2`, `SYSDATETIME()`, `GO`, and `sys.foreign_keys` — all T-SQL/MSSQL-specific. None of this works on PostgreSQL without a full rewrite.

---

## 3. Azure Front Door vs Application Gateway (Student Subscription)

### ❌ Azure Front Door
- **Hard platform block** on Student + Free Trial subscriptions.
- Error: *"Free Trial and Student accounts are forbidden from using Azure FrontDoor resources"*
- No workaround without upgrading to Pay-As-You-Go.

### ⚠️ Azure Application Gateway — Can You Use It?

**Short answer: Technically yes, but it is NOT recommended for your use case.**

| Factor | Details |
|---|---|
| **Platform restriction** | ✅ No hard block — deployable on student subscription |
| **Cost** | ❌ ~$0.008/hr (gateway fixed cost) + $0.008/CU processed = ~$18–25/month from your $100 credit just for the gateway |
| **What it does** | L7 load balancer + optional WAF (Azure WAF v2), TLS termination, path-based routing |
| **Does it replace Cloudflare CDN?** | ❌ No — App Gateway has no edge CDN PoPs; it is a regional Azure resource (single datacenter) |
| **Does it add value here?** | Only if you need Azure-native WAF + SSL offload + multi-backend routing within one VNet |
| **Verdict** | **Skip it.** It burns ~25% of your credit for features Cloudflare provides for free at the edge globally |

> **Recommendation:** Use **Cloudflare (free/pro) + Azure Static Web Apps + App Service** — you get CDN + WAF + DDoS protection at the global edge with zero Azure cost for the WAF/CDN layer.

---

## 4. Step-by-Step Setup

### 4.1 Frontend — Azure Static Web Apps

**Step 1 — Create the resource**
```
Azure Portal → Create Resource → Static Web App
  Name:           student-record-frontend
  Plan:           Free
  Region:         East US (or nearest)
  Source:         GitHub
  Repository:     your-org/student-record-mgmt
  Branch:         main
  App location:   /frontend
  Output location: build   (or dist for Vite)
```

**Step 2 — Configure `staticwebapp.config.json`** (place in `/frontend/public/`)
```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif}", "/css/*"]
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
```

**Step 3 — Add custom domain**
```
Static Web App → Custom domains → Add
  Domain: students.yourdomain.com
  Follow CNAME/TXT validation steps
```

---

### 4.2 Backend — Azure App Service

**Step 1 — Create App Service Plan + App**
```
Plan:   B1 (Basic) — ~$13/month | supports VNet integration
Runtime: Node.js 20 LTS
Region: Same as VNet (e.g., East US)
Name:   student-record-api
```

**Step 2 — Environment Variables** (App Service → Configuration → App Settings)
```
DATABASE_URL       = postgresql://adminuser:password@pgserver.private.postgres.database.azure.com:5432/studentdb
NODE_ENV           = production
PORT               = 8080
ALLOWED_ORIGINS    = https://students.yourdomain.com
```

**Step 3 — VNet Integration**
```
App Service → Networking → VNet Integration → Add VNet
  VNet:   student-record-vnet
  Subnet: appservice-subnet (10.0.1.0/24)

After adding, set App Setting:
  WEBSITE_VNET_ROUTE_ALL = 1
```

**Step 4 — IP Restrictions (Cloudflare-only traffic)**

Run this script to bulk-add all Cloudflare IP ranges. Cloudflare publishes them at `https://www.cloudflare.com/ips-v4` and `https://www.cloudflare.com/ips-v6`.

```bash
#!/bin/bash
# restrict-to-cloudflare.sh
# Run once after deploying App Service

RESOURCE_GROUP="student-record-rg"
APP_NAME="student-record-api"

# Fetch Cloudflare IP ranges
CF_IPV4=$(curl -s https://www.cloudflare.com/ips-v4)
CF_IPV6=$(curl -s https://www.cloudflare.com/ips-v6)

PRIORITY=100

echo "Adding Cloudflare IPv4 ranges..."
for ip in $CF_IPV4; do
  az webapp config access-restriction add \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --rule-name "cf-ipv4-$(echo $ip | tr '/' '-')" \
    --action Allow \
    --ip-address "$ip" \
    --priority $PRIORITY \
    --scm-site false
  ((PRIORITY++))
done

echo "Adding Cloudflare IPv6 ranges..."
for ip in $CF_IPV6; do
  az webapp config access-restriction add \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --rule-name "cf-ipv6-$(echo $ip | tr '/' '-')" \
    --action Allow \
    --ip-address "$ip" \
    --priority $PRIORITY \
    --scm-site false
  ((PRIORITY++))
done

# Set default action to Deny
az webapp config access-restriction set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --default-action Deny

echo "Done. App Service now only accepts traffic from Cloudflare."
```

> **Important:** After adding IP restrictions, your `*.azurewebsites.net` URL is still guessable by attackers. Set an additional requirement: add a **Cloudflare secret header** and validate it in your backend middleware (see §4.5).

---

### 4.3 Database — Azure SQL Database (MSSQL-compatible, Private Access)

> Your backend already uses `mssql` driver, T-SQL queries, and `database_setup.sql` is written in T-SQL. **Azure SQL Database is the correct and only compatible choice.** Zero code changes needed.

**Step 1 — Create the VNet and subnets first**
```
Virtual Network:   student-record-vnet  (10.0.0.0/16)
Subnets:
  appservice-subnet   10.0.1.0/24   (for App Service VNet integration)
  sqldb-subnet        10.0.2.0/24   (for Azure SQL private endpoint)
```

**Step 2 — Create Azure SQL Server + Database**
```
Azure Portal → Create Resource → Azure SQL
  Deployment option: SQL Database (single database)

  SQL Server (logical server):
    Server name:    student-record-sqlsrv
    Auth method:    SQL authentication
    Admin login:    sqladmin
    Password:       [strong password — store in Key Vault]
    Region:         East US (same as App Service)

  Database:
    Name:           student_db
    Compute + storage:
      Service tier: General Purpose — Serverless  ← auto-pauses when idle = near $0 cost
      vCores:       1 (min) / 4 (max)
      Auto-pause:   1 hour

  Networking tab:
    Connectivity method: Private endpoint  ← CRITICAL (no public access)
    Private endpoint:
      VNet:    student-record-vnet
      Subnet:  sqldb-subnet
      Private DNS zone: auto-create (privatelink.database.windows.net)

  Additional settings:
    Deny public network access: YES
```

**Step 3 — NSG on sqldb-subnet**
```
Create NSG: sqldb-nsg
Attach to:  sqldb-subnet

Inbound Rules:
  Priority 100 — Allow TCP 1433 from appservice-subnet (10.0.1.0/24)
  Priority 4096 — Deny All inbound

Outbound Rules:
  Priority 4096 — Deny All outbound
```

**Step 4 — Run your existing database_setup.sql**
```bash
# Connect via Azure Cloud Shell or sqlcmd from App Service
sqlcmd -S student-record-sqlsrv.database.windows.net \
       -d student_db \
       -U sqladmin \
       -P 'YOUR_PASSWORD' \
       -i database_setup.sql
# Your T-SQL file runs without modification
```

**Step 5 — Backend environment variables** (App Service → Configuration)
```
DB_SERVER    = student-record-sqlsrv.database.windows.net
DB_USER      = sqladmin
DB_PASSWORD  = YOUR_PASSWORD   (or use Key Vault reference)
DB_NAME      = student_db
DB_PORT      = 1433
DB_ENCRYPT   = true
DB_TRUST_SERVER_CERTIFICATE = false
```

> **Your `db.js` works as-is.** The connection string format your code already expects (`DB_SERVER`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`) maps directly to Azure SQL Database with no changes.

---

### 4.4 Cloudflare Setup (CDN + WAF)

#### 4.4.1 DNS Configuration
```
Cloudflare Dashboard → yourdomain.com → DNS

Add CNAME:
  Name:     students          (frontend)
  Target:   <your-swa>.azurestaticapps.net
  Proxy:    ✅ Proxied (orange cloud) ← enables CDN + WAF

Add CNAME:
  Name:     api               (backend — optional, if you expose API via custom domain)
  Target:   student-record-api.azurewebsites.net
  Proxy:    ✅ Proxied
```

#### 4.4.2 SSL/TLS Settings
```
Cloudflare → SSL/TLS → Overview
  Mode: Full (strict)  ← Cloudflare verifies Azure's cert; prevents MITM between CF and Azure
```

#### 4.4.3 WAF — Enable Managed Rules (Pro plan for full OWASP)
```
Cloudflare → Security → WAF → Managed Rules

Free Plan:
  ✅ Cloudflare Free Managed Ruleset  (covers Log4j, Shellshock, high-impact CVEs)

Pro Plan (recommended, $20/mo):
  ✅ Cloudflare OWASP Core Ruleset
      - Sensitivity: Medium
      - Paranoia Level: PL2
      - Score threshold: 25 (block when score ≥ 25)
  ✅ Cloudflare Managed Ruleset
```

#### 4.4.4 WAF — Custom Rules
```
Cloudflare → Security → WAF → Custom Rules → Create Rule

Rule 1: Block direct .azurewebsites.net / .azurestaticapps.net access
  Expression: (http.host contains "azurewebsites.net") or 
              (http.host contains "azurestaticapps.net")
  Action: Block

Rule 2: Block common attack paths
  Expression: (http.request.uri.path contains "/.env") or
              (http.request.uri.path contains "/wp-admin") or
              (http.request.uri.path contains "/.git") or
              (http.request.uri.path contains "/phpMyAdmin")
  Action: Block (with Custom HTML response — see §4.4.5)

Rule 3: Rate limiting on API
  Expression: (http.request.uri.path matches "^/api/") and
              (rate(1m) > 100)
  Action: Block
```

#### 4.4.5 WAF Custom Block Page

Go to: **Security → WAF → Custom Rules → [your rule] → Block → Custom response**

Set **Response Code**: `403`  
Set **Content-Type**: `text/html`  
Paste the following HTML (≤ 2048 bytes):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Access Blocked</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#0f0f1a;color:#e2e8f0;
  display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#1a1a2e;border:1px solid #ff4444;border-radius:12px;
  padding:2.5rem;max-width:480px;text-align:center;box-shadow:0 0 40px #ff444422}
.icon{font-size:3.5rem;margin-bottom:1rem}
h1{color:#ff4444;font-size:1.6rem;margin-bottom:.75rem}
p{color:#94a3b8;line-height:1.6;margin-bottom:1.5rem;font-size:.95rem}
.ref{background:#0f0f1a;border-radius:6px;padding:.5rem 1rem;
  font-family:monospace;font-size:.8rem;color:#64748b;margin-bottom:1.5rem}
a{color:#60a5fa;text-decoration:none;font-size:.9rem}
a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="card">
  <div class="icon">🛡️</div>
  <h1>Access Blocked</h1>
  <p>Your request has been blocked by our Web Application Firewall because it was identified as potentially harmful or violates our security policy.</p>
  <div class="ref">Ray ID: {{cf.ray_id}}</div>
  <p>If you believe this is a mistake, please contact support with the Ray ID above.</p>
  <br>
  <a href="/">← Return to Home</a>
</div>
</body>
</html>
```

> **Note:** `{{cf.ray_id}}` renders the Cloudflare Ray ID for the blocked request — useful for support troubleshooting. This is supported in WAF custom responses.

---

### 4.5 Secret Header Validation (Defense-in-Depth)

Even with IP restrictions, add a shared secret header so your App Service can verify traffic genuinely came through Cloudflare (not someone who knows your `azurewebsites.net` URL and happens to proxy from a CF IP).

**Step 1 — Cloudflare: Add Transform Rule to inject header**
```
Cloudflare → Rules → Transform Rules → Modify Request Header → Create rule

Rule name:  Inject Origin Secret
When:       All incoming requests
Action:     Set static → Header name: X-CF-Secret → Value: <random-64-char-hex>
```

**Step 2 — Backend middleware (Node.js/Express)**
```javascript
// middleware/cloudflareGuard.js
const CF_SECRET = process.env.CF_ORIGIN_SECRET;

module.exports = function cloudflareGuard(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  
  const incomingSecret = req.headers['x-cf-secret'];
  if (!incomingSecret || incomingSecret !== CF_SECRET) {
    return res.status(403).json({ 
      error: 'Direct access to origin is not permitted.' 
    });
  }
  next();
};

// In app.js / server.js — apply globally BEFORE routes
app.use(require('./middleware/cloudflareGuard'));
```

**Step 3 — Add secret to App Service environment**
```
App Service → Configuration → App Settings → New:
  CF_ORIGIN_SECRET = <same-64-char-hex-as-cloudflare-transform-rule>
```

---

## 5. Full Resource Checklist

```
Resource Group: student-record-rg  (East US)
│
├── Networking
│   ├── Virtual Network: student-record-vnet (10.0.0.0/16)
│   ├── Subnet: appservice-subnet (10.0.1.0/24)
│   ├── Subnet: sqldb-subnet (10.0.2.0/24)   [for private endpoint NIC]
│   └── NSG: sqldb-nsg → attached to sqldb-subnet
│
├── Frontend
│   └── Static Web App: student-record-frontend (Free tier)
│       └── Custom domain: students.yourdomain.com → Cloudflare CNAME
│
├── Backend
│   ├── App Service Plan: student-record-asp (B1, Linux)
│   └── App Service: student-record-api   (Node.js + mssql driver)
│       ├── VNet Integration → appservice-subnet
│       ├── Access Restrictions: Cloudflare IPs only
│       └── App Settings: DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME,
│                         DB_PORT=1433, DB_ENCRYPT=true, CF_ORIGIN_SECRET
│
├── Database
│   ├── SQL Server (logical): student-record-sqlsrv
│   ├── Azure SQL Database: student_db  (Serverless, General Purpose)
│   ├── Private Endpoint: → sqldb-subnet (no public IP on DB)
│   └── Private DNS Zone: privatelink.database.windows.net → linked to VNet
│
└── Key Vault: student-record-kv
    └── Secrets: DB_PASSWORD, CF_ORIGIN_SECRET
        └── App Service references: @Microsoft.KeyVault(SecretUri=...)
```

---

## 6. Cloudflare Plan Comparison for This Use Case

| Feature | Free | Pro ($20/mo) |
|---|---|---|
| CDN (global PoPs) | ✅ | ✅ |
| DDoS protection | ✅ Basic | ✅ Advanced |
| SSL/TLS | ✅ | ✅ |
| WAF Custom Rules | ✅ 5 rules | ✅ 100 rules |
| Cloudflare Free Managed Ruleset | ✅ | ✅ |
| **OWASP Core Ruleset** | ❌ | ✅ |
| Bot Fight Mode | ✅ Basic | ✅ Super Bot Fight Mode |
| Rate Limiting | ❌ | ✅ |
| Custom Block Page | ✅ (on custom rules) | ✅ |
| Analytics & Firewall Events | ✅ 24hr | ✅ 72hr |

> **Recommendation:** Start with **Free**. If OWASP coverage is a grading requirement, upgrade to **Pro** — $20/mo is outside your Azure credit but Cloudflare billing is separate.

---

## 7. Security Posture Summary

| Threat | Mitigation |
|---|---|
| DDoS | Cloudflare Anycast network absorbs volumetric attacks |
| SQLi, XSS, CSRF | Cloudflare OWASP Ruleset (Pro) + input validation in backend |
| Bypassing WAF (direct origin hit) | IP restriction to CF IPs + X-CF-Secret header check |
| DB exposed to internet | Private VNet access, no public endpoint |
| DB exposed to other Azure services | NSG allows only appservice-subnet on port 5432 |
| Credential theft | Secrets in Azure Key Vault, not hardcoded |
| MITM (CF → Azure) | TLS Full (Strict) mode on Cloudflare |
| Sensitive path scraping (/.env, etc.) | Cloudflare WAF custom rules block immediately |
| OWASP Top 10 | Cloudflare managed + custom rules, secure coding in backend |

---

## 8. Estimated Azure Credit Consumption

| Resource | Tier | Est. Monthly Cost |
|---|---|---|
| Azure Static Web Apps | Free | **$0** |
| App Service Plan (B1) | Basic | ~$13.14 |
| Azure SQL Database (Serverless, 1 vCore) | General Purpose | ~$0–10 (auto-pauses when idle) |
| Virtual Network | — | **$0** |
| Private Endpoint (SQL) | — | ~$0.01/hr ≈ $7.30 |
| Storage (SWA + SQL backups) | — | ~$1–2 |
| **Total** | | **~$21–33/month** |

$100 credit → **~3–4 months of full operation**.

> **Avoid Application Gateway** — it adds ~$18–25/month for no benefit over this stack.
