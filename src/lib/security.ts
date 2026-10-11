export function supabaseOrigin(value: string | undefined) {
  try { const url=new URL(value || ""); return url.protocol === "https:" && !url.username && !url.password ? url.origin : ""; } catch { return ""; }
}

export function securityPolicy(nonce: string, url: string | undefined, development = false) {
  if (!/^[A-Za-z0-9+/=_-]{16,128}$/.test(nonce)) throw new Error("Invalid server nonce");
  const origin=supabaseOrigin(url);
  const connection=origin ? `${origin} ${origin.replace(/^https:/,"wss:")}` : "";
  return [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // Existing React style attributes require this; scripts remain nonce-only.
    "style-src 'self' 'unsafe-inline'", `img-src 'self' data: ${origin}`,
    `connect-src 'self' ${connection}${development ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    "font-src 'self'", "media-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'",
  ].join("; ");
}

export function trustedAvatar(value: string, configuredUrl=process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const origin=supabaseOrigin(configuredUrl);
  try { const url=new URL(value); return origin && url.origin===origin && !url.username && !url.password && url.pathname.startsWith("/storage/v1/object/public/avatars/") ? url.href : ""; } catch { return ""; }
}
