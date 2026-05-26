/**
 * cloudflareGuard.js
 *
 * Validates that requests hitting the App Service origin actually came through
 * YOUR Cloudflare proxy and not directly from the internet.
 *
 * How it works:
 *  - Cloudflare injects a secret header (x-cf-secret) via a Transform Rule.
 *  - This middleware checks that header against CF_ORIGIN_SECRET env var.
 *  - Direct hits to *.azurewebsites.net that lack the header get 403.
 *
 * Setup in Cloudflare (Free plan):
 *  Rules → Transform Rules → Modify Request Header → Create rule
 *    Header name:  x-cf-secret
 *    Value:        <same value as CF_ORIGIN_SECRET in App Service config>
 *    When:         All incoming requests
 *
 * Setup in Azure App Service → Configuration → Application settings:
 *    CF_ORIGIN_SECRET = <random hex, e.g. output of: openssl rand -hex 32>
 */

const CF_SECRET = process.env.CF_ORIGIN_SECRET;

module.exports = function cloudflareGuard(req, res, next) {
  // Skip in local development — allows normal testing
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  // Warn at startup if secret is not configured
  if (!CF_SECRET) {
    console.warn(
      "[cloudflareGuard] CF_ORIGIN_SECRET is not set. " +
        "Origin protection is DISABLED in production!"
    );
    return next();
  }

  const incoming = req.headers["x-cf-secret"];

  if (!incoming || incoming !== CF_SECRET) {
    // Log the attempt with enough detail for audit but don't expose internals
    console.warn(
      `[cloudflareGuard] Blocked direct origin request | ` +
        `IP: ${req.ip} | Path: ${req.method} ${req.path} | ` +
        `UA: ${req.headers["user-agent"] || "none"}`
    );
    return res.status(403).json({
      error: "Access denied. Direct origin access is not permitted.",
    });
  }

  next();
};
