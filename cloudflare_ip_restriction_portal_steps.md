# Manual Portal Steps: Restrict App Service to Cloudflare IPs Only
## Equivalent to `restrict-to-cloudflare.sh`

> **What this does:** Adds every Cloudflare IP range as an **Allow** rule in your App Service
> Access Restrictions, then sets the default action to **Deny**. After this, only traffic
> arriving from Cloudflare's edge nodes reaches your backend.  
> Your script uses resource group `student-record-rg` and app name `student-record-api` /
> `student-mgmt-be` — adjust whichever name your portal shows.

---

## Navigate to Access Restrictions

```
Azure Portal (portal.azure.com)
  → App Services
  → student-mgmt-be          ← your actual app name
  → Settings (left sidebar)
  → Networking
  → Inbound traffic section → Access restriction
```

You will see a table with **Site** and **Advanced tool site (SCM)** tabs. Work on the **Site** tab throughout.

---

## STEP 1 — Add Cloudflare IPv4 Rules

Click **+ Add rule** for each row below. Fill in **exactly** these values each time:

| Field | Value |
|-------|-------|
| **Name** | *(see "Rule Name" column below)* |
| **Action** | `Allow` |
| **Priority** | *(see "Priority" column)* |
| **Type** | `IPv4` |
| **IP Address Block** | *(see "IP/CIDR" column)* |
| **Add rule to SCM site** | ❌ **Unchecked** |

Click **Add rule** to save each one before adding the next.

### IPv4 Rules (15 total)

| Priority | Rule Name | IP/CIDR |
|----------|-----------|---------|
| 100 | `cf-ipv4-173-245-48-0-20` | `173.245.48.0/20` |
| 101 | `cf-ipv4-103-21-244-0-22` | `103.21.244.0/22` |
| 102 | `cf-ipv4-103-22-200-0-22` | `103.22.200.0/22` |
| 103 | `cf-ipv4-103-31-4-0-22`   | `103.31.4.0/22`   |
| 104 | `cf-ipv4-141-101-64-0-18` | `141.101.64.0/18` |
| 105 | `cf-ipv4-108-162-192-0-18`| `108.162.192.0/18`|
| 106 | `cf-ipv4-190-93-240-0-20` | `190.93.240.0/20` |
| 107 | `cf-ipv4-188-114-96-0-20` | `188.114.96.0/20` |
| 108 | `cf-ipv4-197-234-240-0-22`| `197.234.240.0/22`|
| 109 | `cf-ipv4-198-41-128-0-17` | `198.41.128.0/17` |
| 110 | `cf-ipv4-162-158-0-0-15`  | `162.158.0.0/15`  |
| 111 | `cf-ipv4-104-16-0-0-13`   | `104.16.0.0/13`   |
| 112 | `cf-ipv4-104-24-0-0-14`   | `104.24.0.0/14`   |
| 113 | `cf-ipv4-172-64-0-0-13`   | `172.64.0.0/13`   |
| 114 | `cf-ipv4-131-0-72-0-22`   | `131.0.72.0/22`   |

---

## STEP 2 — Add Cloudflare IPv6 Rules

Same process, but change **Type** to `IPv4` → select `IPv6` in the dropdown.

> [!NOTE]
> Azure Portal shows a single **Type** dropdown for the IP block field. For IPv6 ranges, select **IPv6** from that dropdown, then paste the IPv6 CIDR.

| Priority | Rule Name | IP/CIDR |
|----------|-----------|---------|
| 115 | `cf-ipv6-2400-cb00--32`  | `2400:cb00::/32`  |
| 116 | `cf-ipv6-2606-4700--32`  | `2606:4700::/32`  |
| 117 | `cf-ipv6-2803-f800--32`  | `2803:f800::/32`  |
| 118 | `cf-ipv6-2405-b500--32`  | `2405:b500::/32`  |
| 119 | `cf-ipv6-2405-8100--32`  | `2405:8100::/32`  |
| 120 | `cf-ipv6-2a06-98c0--29`  | `2a06:98c0::/29`  |
| 121 | `cf-ipv6-2c0f-f248--32`  | `2c0f:f248::/32`  |

---

## STEP 3 — Set Default Action to Deny

This is the most critical step — it blocks everything that isn't in the allow list above.

After adding all rules, look at the top of the Access Restrictions page for **"Unmatched rule action"** or **"Default action"**.

```
Access Restrictions page
  → "Unmatched rule action" section (top of the rules table)
  → Change from:  Allow  (default)
  → Change to:    Deny
  → Click Save
```

> [!CAUTION]
> Do NOT click Save on Deny until you have added ALL Cloudflare IP rules above.
> If you set Deny first, you will immediately lock yourself out of the site.

> [!WARNING]
> This also blocks the Azure Portal's "Test" / "Browse" button and direct `*.azurewebsites.net`
> access from your browser — that's intentional. All traffic must now flow through Cloudflare.

---

## STEP 4 — Verify the SCM Site Is NOT Restricted

Click the **Advanced tool site (SCM)** tab and confirm it is **not** set to Deny.
The SCM site is used by GitHub Actions to deploy — locking it out breaks your CI/CD.

Leave SCM site as default (`Allow All`) or create a separate rule allowing GitHub Actions IPs if needed.

---

## STEP 5 — Confirm the Final Rule Set

Your Access Restrictions table should look like this (22 rules total):

| Priority | Name | Type | CIDR | Action |
|----------|------|------|------|--------|
| 100 | cf-ipv4-173-245-48-0-20 | IPv4 | 173.245.48.0/20 | Allow |
| 101 | cf-ipv4-103-21-244-0-22 | IPv4 | 103.21.244.0/22 | Allow |
| ... | *(13 more IPv4 rows)* | | | |
| 115 | cf-ipv6-2400-cb00--32 | IPv6 | 2400:cb00::/32 | Allow |
| ... | *(6 more IPv6 rows)* | | | |
| *default* | — | — | All other traffic | **Deny** |

---

## STEP 6 — Smoke Test

### ✅ Should work (via Cloudflare proxy)
Open your browser and visit:
```
https://api.yourdomain.com/health
```
Expected response:
```json
{"status":"UP","message":"Server is running"}
```

### ✅ Should be blocked (direct origin)
```bash
curl https://student-mgmt-be.azurewebsites.net/health
```
Expected: **HTTP 403** or connection refused — direct origin is now locked.

---

## What The Script Did vs What You Just Did

| Script Command | Portal Equivalent |
|----------------|-------------------|
| `az webapp config access-restriction add --action Allow --ip-address <CF_IP>` | Added each row in the table in Steps 1 & 2 |
| `--priority $PRIORITY` (100 → 121) | Priority number in each rule |
| `--scm-site false` | "Add rule to SCM site" checkbox left unchecked |
| `az webapp config access-restriction set --default-action Deny` | Changed "Unmatched rule action" to Deny in Step 3 |

---

> [!TIP]
> Cloudflare publishes their IP list at:
> - IPv4: https://www.cloudflare.com/ips-v4  
> - IPv6: https://www.cloudflare.com/ips-v6  
> 
> These ranges rarely change, but if Cloudflare adds new IPs in the future, add new Allow rules
> with the next available priority number (122, 123, …).
