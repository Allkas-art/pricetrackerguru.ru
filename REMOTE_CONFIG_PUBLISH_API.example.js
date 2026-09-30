/**
 * Example Cloudflare Worker backend for the Remote Control v1 admin.
 *
 * Required Worker secrets/vars:
 *   ADMIN_TOKEN  - long random secret used by the admin UI
 *   GITHUB_TOKEN - GitHub token with permission to update the target file
 *   GITHUB_OWNER
 *   GITHUB_REPO
 *   GITHUB_BRANCH (default: main)
 *   GITHUB_PATH   (default: config.json)
 *
 * The token is never placed into the public admin page.
 * Configure the admin page to POST JSON to this Worker endpoint.
 */

const ALLOWED_ORIGIN = "https://pricetrackerguru.ru";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() }
  });
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function validateConfig(c) {
  const errors = [];
  if (!c || typeof c !== "object") errors.push("config must be an object");
  if (!c?.version_control?.current_version_name) errors.push("current_version_name is required");
  if (!Number.isInteger(c?.version_control?.min_version_code) || c.version_control.min_version_code < 1) errors.push("min_version_code is invalid");
  if (!Number.isInteger(c?.app_limits?.max_products) || c.app_limits.max_products < 1 || c.app_limits.max_products > 1000) errors.push("max_products is invalid");
  if (!Number.isInteger(c?.app_limits?.history_months) || c.app_limits.history_months < 1 || c.app_limits.history_months > 24) errors.push("history_months is invalid");
  if (c?.version_control?.force_update && c.version_control.min_version_code < 3) errors.push("force_update cannot target a version below current APK 2.0.0");
  for (const key of ["update_url", "telegram_url", "max_channel_url", "rustore_review_url", "privacy_policy_url", "terms_of_service_url"]) {
    let value = c.version_control?.[key] ?? c.community_links?.[key] ?? c.legal_links?.[key];
    if (value && !/^https:\/\//i.test(value)) errors.push(`${key} must use HTTPS`);
  }
  return errors;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
    if (request.method !== "POST") return json({ ok: true, service: "remote-config-publish" });

    const auth = request.headers.get("Authorization") || "";
    if (auth !== `Bearer ${env.ADMIN_TOKEN}`) return json({ ok: false, error: "Unauthorized" }, 401);

    let config;
    try { config = await request.json(); }
    catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

    const errors = validateConfig(config);
    if (errors.length) return json({ ok: false, errors }, 400);

    const owner = env.GITHUB_OWNER;
    const repo = env.GITHUB_REPO;
    const branch = env.GITHUB_BRANCH || "main";
    const path = env.GITHUB_PATH || "config.json";
    const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pricetrackerguru-remote-config"
    };

    const currentResp = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
    if (!currentResp.ok) return json({ ok: false, error: "Cannot read current config from GitHub", status: currentResp.status }, 502);
    const current = await currentResp.json();

    const body = JSON.stringify(config, null, 2) + "\n";
    const encoded = btoa(unescape(encodeURIComponent(body)));
    const putResp = await fetch(api, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `remote-config: update ${config.version_control.current_version_name}`,
        content: encoded,
        sha: current.sha,
        branch
      })
    });

    if (!putResp.ok) {
      const detail = await putResp.text();
      return json({ ok: false, error: "GitHub update failed", status: putResp.status, detail: detail.slice(0, 500) }, 502);
    }

    return json({ ok: true, version: config.version_control.current_version_name, sha: await sha256Hex(body) });
  }
};
