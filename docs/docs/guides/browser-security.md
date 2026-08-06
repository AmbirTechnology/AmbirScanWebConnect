---
sidebar_position: 2
description: How AmbirScan Web Connect handles CORS, Chrome Private Network Access, and HTTPS certificate trust for localhost scanning.
keywords: [CORS localhost, Private Network Access, PNA header, localhost HTTPS certificate, browser security scanning]
---

# Browser Security

How AmbirScan Web Connect handles CORS, Private Network Access, and HTTPS certificate trust.

## CORS (Cross-Origin Resource Sharing)

Your web application runs on a different origin (e.g., `https://yourapp.com`) than the scanner service (`https://localhost:53052`). The service is configured to accept requests from any origin, since it only binds to localhost and is not network-accessible.

The SDK automatically sets the correct CORS headers:

```javascript
fetch(url, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
});
```

No additional CORS configuration is needed on your side.

## Chrome Private Network Access

Chrome 90+ includes **Private Network Access** (PNA) security, which restricts requests from public websites to localhost. When your web app makes a request to `localhost:53052`, Chrome sends a special preflight request:

```
OPTIONS /api/twain
Access-Control-Request-Private-Network: true
```

AmbirScan Web Connect automatically responds with the required header:

```
Access-Control-Allow-Private-Network: true
```

This prevents Chrome from showing a security prompt to your users. No action is needed on your part.

:::info
Chrome's newer **Local Network Access** feature (Chrome 138+) may introduce additional permission prompts. AmbirScan Web Connect is designed to handle these automatically as they are rolled out.
:::

## HTTPS Certificate

The service uses a self-signed certificate. The installer adds it to the Windows trusted certificate store, so browsers typically trust it automatically.

### If Users See Certificate Warnings

1. Navigate to `https://localhost:53052/health` directly
2. Accept the certificate warning (click "Advanced" > "Proceed")
3. The certificate will be remembered for future requests

### Certificate Details

| Property | Value |
|----------|-------|
| Subject | `CN=ASWCN Scanner Bridge` |
| Store | Local Machine > Personal |
| Trust | Added to Trusted Root Certification Authorities |
| Validity | 5 years from installation |

## Edge

Microsoft Edge follows the same Private Network Access policies as Chrome (both are Chromium-based) and trusts the certificate through the Windows certificate store, so it works out of the box just like Chrome.

## Firefox

Firefox is supported, but requires one extra step. Unlike Chrome and Edge, **Firefox does not use the Windows certificate store** — it maintains its own (NSS) trust database. The self-signed certificate the installer adds to Windows is therefore invisible to Firefox, and the SDK's background requests to `https://localhost:53052` will fail with a certificate error until Firefox is told to trust it.

Firefox does not enforce Private Network Access restrictions and honors the CORS headers the service provides, so the certificate is the only obstacle. Choose one of the following:

### Option 1 — Enable enterprise roots (recommended)

Set `security.enterprise_roots.enabled` to `true`. This makes Firefox additionally read the operating system's trusted certificate store, so it picks up the installed certificate automatically.

- **Per machine:** open `about:config`, search for `security.enterprise_roots.enabled`, and set it to `true`.
- **Managed deployments:** push the same setting through a Firefox [enterprise policy](https://support.mozilla.org/kb/setting-certificate-authorities-firefox) (`policies.json` / Group Policy). This is the cleanest option for kiosk and mailroom fleets.

### Option 2 — Accept the certificate manually

Have each user navigate to `https://localhost:53052/health`, click **Advanced**, then **Accept the Risk and Continue**. The exception is stored per Firefox profile and persists for future requests.

:::note
Chrome and Edge need none of these steps — they trust the certificate automatically through the Windows store. The extra configuration applies to Firefox only.
:::
