# CLAUDE.md — AmbirScan Web Connect Integration Guide

This file provides AI assistants with the context needed to generate framework-specific integration code for AmbirScan Web Connect.

## Project Overview

AmbirScan Web Connect enables web applications to control local TWAIN scanners. A Windows service + desktop app pair runs on each client machine, exposing a REST API on `https://localhost:53052`. Your web app includes a JavaScript SDK that talks to this local service via `fetch` with CORS.

**Live demo:** [https://ambirscanwebconnect.azurewebsites.net](https://ambirscanwebconnect.azurewebsites.net) — install the desktop components, then open this URL to scan immediately.

```
┌──────────────────┐    HTTPS (fetch, CORS)     ┌────────────────────────┐    TWAIN    ┌─────────┐
│   Your Web App   │ ──────────────────────────→ │  localhost:53052       │ ──────────→ │ Scanner │
│   (Browser)      │  mode:'cors'               │  (Windows Service +   │             │         │
│                  │  credentials:'include'      │   Desktop App)        │             │         │
└──────────────────┘                             └────────────────────────┘             └─────────┘
```

**Key facts:**
- Communication is **client-side only** — the browser's JavaScript calls `https://localhost:53052` directly
- Your server never talks to the scanner service; it only needs to serve the SDK JS file and set correct CSP headers
- The service allows **any origin** via CORS (`Access-Control-Allow-Origin` echoes the request origin)
- **Chrome Private Network Access** preflight headers are handled automatically by the service
- The service uses a **self-signed HTTPS certificate** installed into the Windows trusted store by the installer

**Licensing:**
- **Free** with Ambir Technology scanners — no license required
- **Third-party scanners** require a license; unlicensed scans include a watermark
- **OCR and barcode decoding** require additional licensing
- Contact Ambir for pricing: [https://ambir.com/developers/](https://ambir.com/developers/)

## SDK Reference

**File:** `sdk/js/aswcn-scanner-bridge.js` — a single vanilla JavaScript class with no dependencies.

### Constructor

```javascript
const scanner = new ASWCNScannerBridge(baseUrl);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `baseUrl` | `string \| null` | `null` | If `null`, tries `fetch('/api/config')` for a `scannerServiceUrl` property, then falls back to `https://localhost:53052` |

Pass the URL explicitly to skip the config lookup:

```javascript
const scanner = new ASWCNScannerBridge('https://localhost:53052');
```

### Methods

All methods are `async` and return Promises.

#### `checkServiceStatus() → Promise<boolean>`

Returns `true` if the Windows service is running AND the desktop app is connected.

```javascript
const ok = await scanner.checkServiceStatus();
```

#### `getSources() → Promise<Array>`

Returns available TWAIN scanners. Each entry has: `{ name, manufacturer, model, isOnline, hasFeeder, hasFlatbed, supportsDuplex }`.

```javascript
const sources = await scanner.getSources();
// sources[0].name → "Ambir nScan 690gt"
```

#### `openSource(sourceName: string) → Promise<object>`

Opens a scanner. **Must be called before `scan()`.**

```javascript
await scanner.openSource(sources[0].name);
```

#### `closeSource() → Promise<object>`

Closes the currently open scanner. Call when done scanning.

```javascript
await scanner.closeSource();
```

#### `getCapabilities(sourceName: string) → Promise<object>`

Returns scanner capabilities:

```javascript
const caps = await scanner.getCapabilities('Ambir nScan 690gt');
// {
//   resolutions: [150, 200, 300, 600],
//   colorModes: ['Color', 'Grayscale', 'BlackAndWhite'],
//   supportsDuplex: true,
//   supportsAutoRotate: true,
//   supportsAutoDeskew: true,
//   supportsAutoCrop: true,
//   supportedPageSizes: ['Letter', 'Legal', 'A4', 'Auto']
// }
```

#### `scan(params?) → Promise<Array<ScannedImage>>`

Scans and returns an array of images. Scanner must be opened first.

```javascript
const images = await scanner.scan({
    resolution: 200,
    colorMode: 'Grayscale',
    duplexMode: 'Simplex',
    pageSize: 'Letter',
    autoRotate: false,
    autoDeskew: true,
    autoCrop: true,
    outputFormat: 'png',
    barcodeReadingEnabled: false,
    barcodeFilterLevel: 'Normal',
    ocrEnabled: false,
    requestTimeoutSeconds: 0
});
```

**Scan Parameters:**

| Parameter | Type | Default | Values |
|-----------|------|---------|--------|
| `resolution` | `number` | `200` | DPI (e.g., 150, 200, 300, 600) |
| `colorMode` | `string` | `'Grayscale'` | `'Color'`, `'Grayscale'`, `'BlackAndWhite'` |
| `duplexMode` | `string` | `'Simplex'` | `'Simplex'`, `'DuplexLongEdge'`, `'DuplexShortEdge'` |
| `pageSize` | `string` | `'Letter'` | `'Letter'`, `'Legal'`, `'A4'`, `'A5'`, `'Auto'` |
| `autoRotate` | `boolean` | `false` | |
| `autoDeskew` | `boolean` | `true` | |
| `autoCrop` | `boolean` | `true` | |
| `outputFormat` | `string` | `'png'` | `'png'`, `'jpeg'`, `'bmp'`, `'tiff'` |
| `barcodeReadingEnabled` | `boolean` | `false` | |
| `barcodeFilterLevel` | `string` | `'Normal'` | `'Low'`, `'Normal'`, `'High'`, `'VeryHigh'` |
| `ocrEnabled` | `boolean` | `false` | |
| `requestTimeoutSeconds` | `number` | `0` | 0 = no timeout |

**ScannedImage fields:**

| Field | Type | Description |
|-------|------|-------------|
| `base64Data` | `string` | Base64-encoded image data |
| `mimeType` | `string` | e.g., `image/png` |
| `pageNumber` | `number` | 1-based page number |
| `width` | `number` | Pixels |
| `height` | `number` | Pixels |
| `resolution` | `number` | Actual DPI |
| `format` | `string` | Image format name |
| `fileSizeBytes` | `number` | Size in bytes |
| `ocrText` | `string` | OCR text (if enabled) |
| `barcodes` | `array` | `[{ text, barcodeType, confidence, isAamva, parsedData }]` (if enabled) |

#### `getStatus() → Promise<object>`

Returns `{ isOnline, isPaperLoaded, isSourceOpen, ocrEnabled }`.

#### `checkPaperLoaded() → Promise<boolean>`

#### `checkScannerOnline() → Promise<boolean>`

#### `sendCommand(method, params?) → Promise<object>`

Low-level method. Sends a TWAIN Direct command. The SDK methods above use this internally.

### Typical Scan Flow

```javascript
const scanner = new ASWCNScannerBridge('https://localhost:53052');

// 1. Check service availability
if (!await scanner.checkServiceStatus()) {
    showError('AmbirScan Web Connect is not running');
    return;
}

// 2. List scanners
const sources = await scanner.getSources();

// 3. Open a scanner
await scanner.openSource(sources[0].name);

// 4. (Optional) Query capabilities to build UI
const caps = await scanner.getCapabilities(sources[0].name);

// 5. Scan
const images = await scanner.scan({ resolution: 300, colorMode: 'Color' });

// 6. Display images
images.forEach(img => {
    const el = document.createElement('img');
    el.src = `data:${img.mimeType};base64,${img.base64Data}`;
    document.body.appendChild(el);
});

// 7. Close when done
await scanner.closeSource();
```

### Error Handling

All SDK methods throw on failure. Wrap calls in try/catch:

```javascript
try {
    const images = await scanner.scan();
} catch (err) {
    // err.message contains the error description
    // Common: "HTTP error! status: 503" (desktop app not running)
    // Common: "HTTP error! status: 504" (scan timeout)
    // Common: network error (service not installed)
    console.error('Scan failed:', err.message);
}
```

## REST API Quick Reference

Base URL: `https://localhost:53052`. All requests require `mode: 'cors'` and `credentials: 'include'`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/twain` | TWAIN Direct protocol (used by SDK internally) |
| `GET` | `/api/twain/status` | Service + scanner status |
| `GET` | `/api/twain/scanners` | List available scanners |
| `GET` | `/api/twain/scanners/{name}/capabilities` | Scanner capabilities |
| `POST` | `/api/twain/scan` | Simplified scan (body: `{ scannerName, parameters }`) |
| `POST` | `/api/twain/cancel` | Cancel active scan |
| `GET` | `/health` | Health check |

### TWAIN Direct Protocol (POST /api/twain)

This is what the SDK uses internally. Request body:

```json
{
    "kind": "twainlocalscanner",
    "method": "getSources",
    "params": null
}
```

Methods: `getSources`, `openSource`, `closeSource`, `getCapabilities`, `getStatus`, `scan`

Response format:

```json
{
    "kind": "twainlocalscanner",
    "commandId": "...",
    "method": "getSources",
    "results": { "success": true, "code": "SUCCESS" },
    "data": { "availableSources": [...] }
}
```

### Simplified Scan (POST /api/twain/scan)

For frameworks that prefer direct REST over the JS SDK:

```json
// Request
{
    "scannerName": "Ambir nScan 690gt",
    "parameters": {
        "resolution": 300,
        "colorMode": "Color",
        "duplexMode": "Simplex",
        "pageSize": "Letter"
    }
}

// Response
{
    "success": true,
    "images": [{ "base64Data": "...", "mimeType": "image/png", ... }],
    "imageCount": 1,
    "elapsedMs": 3200
}
```

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (missing parameters) |
| 503 | Desktop app not connected |
| 504 | Scan timeout |
| 500 | Internal error |

## Integration Fundamentals

These apply to **every** framework.

### 1. Include the SDK

Copy `sdk/js/aswcn-scanner-bridge.js` into your project's static/public assets and add a `<script>` tag. The file is a single vanilla JS class — no build step, no dependencies.

### 2. Content Security Policy (CSP)

If your app sets CSP headers (most production apps should), you **must** allow connections to the scanner service:

```
Content-Security-Policy: connect-src 'self' https://localhost:53052;
```

Without this, the browser will silently block `fetch` calls to the scanner service.

### 3. Self-Signed Certificate

The installer adds the certificate to the Windows trusted store. Most browsers accept it automatically. If users see certificate warnings, they should navigate to `https://localhost:53052/health` once and accept the certificate.

### 4. Chrome Private Network Access

Chrome 90+ sends a preflight request with `Access-Control-Request-Private-Network: true` when a public website calls localhost. The scanner service responds with `Access-Control-Allow-Private-Network: true` automatically. **No action needed from integrators.**

### 5. CORS

The service echoes back the request origin and allows all methods/headers with credentials. The SDK sets `mode: 'cors'` and `credentials: 'include'` on all requests. **No CORS configuration needed on your server** — CORS is between the browser and `localhost:53052`, not between the browser and your server.

### 6. HTTPS Requirement

The service only accepts HTTPS. Mixed content warnings can occur if your app is served over HTTP — always serve your app over HTTPS in production.

## Framework-Specific Integration

### ASP.NET Core (Razor Pages / MVC)

**Include the SDK** in `wwwroot/js/`:

```
wwwroot/js/aswcn-scanner-bridge.js
```

**Add script tag** in `Views/Shared/_Layout.cshtml` (or the specific page):

```html
<script src="~/js/aswcn-scanner-bridge.js"></script>
```

**CSP middleware** in `Program.cs`:

```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers.Append(
        "Content-Security-Policy",
        "default-src 'self'; connect-src 'self' https://localhost:53052; script-src 'self'; img-src 'self' data:;");
    await next();
});
```

> Note: `img-src 'self' data:` is needed to display scanned images as Base64 data URIs.

**Usage in a Razor view:**

```html
@section Scripts {
<script src="~/js/aswcn-scanner-bridge.js"></script>
<script>
    const scanner = new ASWCNScannerBridge('https://localhost:53052');

    async function scanDocument() {
        if (!await scanner.checkServiceStatus()) {
            alert('Scanner service not available');
            return;
        }
        const sources = await scanner.getSources();
        await scanner.openSource(sources[0].name);
        const images = await scanner.scan({ resolution: 300, colorMode: 'Color' });
        images.forEach(img => {
            document.getElementById('scanResults').innerHTML +=
                `<img src="data:${img.mimeType};base64,${img.base64Data}" />`;
        });
        await scanner.closeSource();
    }
</script>
}
```

---

### Blazor (Server & WebAssembly)

Blazor cannot call JavaScript directly — use `IJSRuntime` interop.

**Include the SDK** in `wwwroot/js/aswcn-scanner-bridge.js`.

**Add script tag** in `wwwroot/index.html` (WASM) or `Pages/_Host.cshtml` (Server):

```html
<script src="js/aswcn-scanner-bridge.js"></script>
```

**Add a JS interop bridge** in `wwwroot/js/scanner-interop.js`:

```javascript
window.scannerBridge = {
    _scanner: new ASWCNScannerBridge('https://localhost:53052'),

    checkStatus: async function () {
        return await this._scanner.checkServiceStatus();
    },
    getSources: async function () {
        return await this._scanner.getSources();
    },
    openSource: async function (name) {
        await this._scanner.openSource(name);
    },
    closeSource: async function () {
        await this._scanner.closeSource();
    },
    scan: async function (params) {
        return await this._scanner.scan(params);
    },
    getCapabilities: async function (name) {
        return await this._scanner.getCapabilities(name);
    }
};
```

```html
<script src="js/scanner-interop.js"></script>
```

**C# wrapper service:**

```csharp
public class ScannerService
{
    private readonly IJSRuntime _js;
    public ScannerService(IJSRuntime js) => _js = js;

    public async Task<bool> CheckStatusAsync()
        => await _js.InvokeAsync<bool>("scannerBridge.checkStatus");

    public async Task<JsonElement[]> GetSourcesAsync()
        => await _js.InvokeAsync<JsonElement[]>("scannerBridge.getSources");

    public async Task OpenSourceAsync(string name)
        => await _js.InvokeVoidAsync("scannerBridge.openSource", name);

    public async Task CloseSourceAsync()
        => await _js.InvokeVoidAsync("scannerBridge.closeSource");

    public async Task<JsonElement[]> ScanAsync(object parameters)
        => await _js.InvokeAsync<JsonElement[]>("scannerBridge.scan", parameters);
}
```

**Register and use:**

```csharp
// Program.cs
builder.Services.AddScoped<ScannerService>();
```

```razor
@* ScanPage.razor *@
@inject ScannerService Scanner

<button @onclick="ScanDocument">Scan</button>
@foreach (var img in _images)
{
    <img src="@img" />
}

@code {
    private List<string> _images = new();

    private async Task ScanDocument()
    {
        if (!await Scanner.CheckStatusAsync()) return;
        var sources = await Scanner.GetSourcesAsync();
        var name = sources[0].GetProperty("name").GetString()!;
        await Scanner.OpenSourceAsync(name);
        var images = await Scanner.ScanAsync(new { resolution = 300, colorMode = "Color" });
        foreach (var img in images)
        {
            var data = img.GetProperty("base64Data").GetString();
            var mime = img.GetProperty("mimeType").GetString();
            _images.Add($"data:{mime};base64,{data}");
        }
        await Scanner.CloseSourceAsync();
    }
}
```

**CSP:** Set in the hosting middleware same as ASP.NET Core above.

---

### Angular

**Include the SDK.** Add to `angular.json`:

```json
"scripts": ["src/assets/js/aswcn-scanner-bridge.js"]
```

Or add the script tag to `src/index.html`:

```html
<script src="assets/js/aswcn-scanner-bridge.js"></script>
```

**Type declaration** (`src/types/aswcn.d.ts`):

```typescript
declare class ASWCNScannerBridge {
    constructor(baseUrl?: string | null);
    checkServiceStatus(): Promise<boolean>;
    getSources(): Promise<Array<{ name: string; manufacturer: string; model: string; isOnline: boolean; hasFeeder: boolean; hasFlatbed: boolean; supportsDuplex: boolean }>>;
    openSource(sourceName: string): Promise<any>;
    closeSource(): Promise<any>;
    getCapabilities(sourceName: string): Promise<{
        resolutions: number[]; colorModes: string[]; supportsDuplex: boolean;
        supportsAutoRotate: boolean; supportsAutoDeskew: boolean; supportsAutoCrop: boolean;
        supportedPageSizes: string[];
    }>;
    getStatus(): Promise<{ isOnline: boolean; isPaperLoaded: boolean; isSourceOpen: boolean; ocrEnabled: boolean }>;
    scan(params?: {
        resolution?: number; colorMode?: string; duplexMode?: string; pageSize?: string;
        autoRotate?: boolean; autoDeskew?: boolean; autoCrop?: boolean; outputFormat?: string;
        barcodeReadingEnabled?: boolean; barcodeFilterLevel?: string; ocrEnabled?: boolean;
        requestTimeoutSeconds?: number;
    }): Promise<Array<{
        base64Data: string; mimeType: string; pageNumber: number; width: number;
        height: number; resolution: number; format: string; fileSizeBytes: number;
        ocrText: string; barcodes: Array<{ text: string; barcodeType: string; confidence: number }>;
    }>>;
    checkPaperLoaded(): Promise<boolean>;
    checkScannerOnline(): Promise<boolean>;
    sendCommand(method: string, params?: any): Promise<any>;
}
```

**Angular service** (`src/app/services/scanner.service.ts`):

```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScannerService {
    private scanner = new ASWCNScannerBridge('https://localhost:53052');

    checkStatus() { return this.scanner.checkServiceStatus(); }
    getSources() { return this.scanner.getSources(); }
    openSource(name: string) { return this.scanner.openSource(name); }
    closeSource() { return this.scanner.closeSource(); }
    getCapabilities(name: string) { return this.scanner.getCapabilities(name); }
    scan(params?: any) { return this.scanner.scan(params); }
}
```

**Component usage:**

```typescript
import { Component } from '@angular/core';
import { ScannerService } from './services/scanner.service';

@Component({
    selector: 'app-scan',
    template: `
        <button (click)="scanDocument()" [disabled]="scanning">
            {{ scanning ? 'Scanning...' : 'Scan' }}
        </button>
        <img *ngFor="let img of scannedImages" [src]="img" />
    `
})
export class ScanComponent {
    scannedImages: string[] = [];
    scanning = false;

    constructor(private scannerService: ScannerService) {}

    async scanDocument() {
        this.scanning = true;
        try {
            const sources = await this.scannerService.getSources();
            await this.scannerService.openSource(sources[0].name);
            const images = await this.scannerService.scan({ resolution: 300, colorMode: 'Color' });
            this.scannedImages = images.map(i => `data:${i.mimeType};base64,${i.base64Data}`);
            await this.scannerService.closeSource();
        } finally {
            this.scanning = false;
        }
    }
}
```

**CSP:** Configure in your server (nginx, Express, etc.) or in `angular.json` proxy config. If using `@angular/cli` dev server, CSP headers go in the response headers of your deployment server.

---

### React

**Include the SDK.** Place in `public/js/aswcn-scanner-bridge.js` and add to `public/index.html`:

```html
<script src="%PUBLIC_URL%/js/aswcn-scanner-bridge.js"></script>
```

Or for Vite-based React, place in `public/js/` and add to `index.html`:

```html
<script src="/js/aswcn-scanner-bridge.js"></script>
```

**Custom hook** (`src/hooks/useScannerBridge.js`):

```javascript
import { useState, useRef, useCallback } from 'react';

export function useScannerBridge(baseUrl = 'https://localhost:53052') {
    const scannerRef = useRef(null);
    const [serviceAvailable, setServiceAvailable] = useState(null);
    const [sources, setSources] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);

    const getScanner = useCallback(() => {
        if (!scannerRef.current) {
            scannerRef.current = new window.ASWCNScannerBridge(baseUrl);
        }
        return scannerRef.current;
    }, [baseUrl]);

    const checkStatus = useCallback(async () => {
        try {
            const ok = await getScanner().checkServiceStatus();
            setServiceAvailable(ok);
            return ok;
        } catch (err) {
            setServiceAvailable(false);
            setError(err.message);
            return false;
        }
    }, [getScanner]);

    const refreshSources = useCallback(async () => {
        try {
            const s = await getScanner().getSources();
            setSources(s);
            return s;
        } catch (err) {
            setError(err.message);
            return [];
        }
    }, [getScanner]);

    const scan = useCallback(async (sourceName, params = {}) => {
        setScanning(true);
        setError(null);
        try {
            await getScanner().openSource(sourceName);
            const images = await getScanner().scan(params);
            await getScanner().closeSource();
            return images;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setScanning(false);
        }
    }, [getScanner]);

    return { checkStatus, refreshSources, scan, serviceAvailable, sources, scanning, error };
}
```

**Component usage:**

```jsx
import { useEffect, useState } from 'react';
import { useScannerBridge } from './hooks/useScannerBridge';

function ScanPage() {
    const { checkStatus, refreshSources, scan, serviceAvailable, sources, scanning, error } = useScannerBridge();
    const [images, setImages] = useState([]);

    useEffect(() => {
        checkStatus().then(ok => ok && refreshSources());
    }, []);

    const handleScan = async () => {
        if (!sources.length) return;
        const result = await scan(sources[0].name, { resolution: 300, colorMode: 'Color' });
        setImages(result.map(i => `data:${i.mimeType};base64,${i.base64Data}`));
    };

    return (
        <div>
            <p>Service: {serviceAvailable ? 'Online' : 'Offline'}</p>
            <button onClick={handleScan} disabled={scanning || !sources.length}>
                {scanning ? 'Scanning...' : 'Scan'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {images.map((src, i) => <img key={i} src={src} alt={`Page ${i + 1}`} />)}
        </div>
    );
}
```

**CSP:** Set via your server's response headers or with `react-helmet`:

```jsx
<Helmet>
    <meta httpEquiv="Content-Security-Policy"
          content="default-src 'self'; connect-src 'self' https://localhost:53052; img-src 'self' data:;" />
</Helmet>
```

---

### Vue.js

**Include the SDK** in `public/js/aswcn-scanner-bridge.js` and add to `index.html`:

```html
<script src="/js/aswcn-scanner-bridge.js"></script>
```

**Composable** (`src/composables/useScanner.js`):

```javascript
import { ref, shallowRef } from 'vue';

export function useScanner(baseUrl = 'https://localhost:53052') {
    const scanner = shallowRef(new window.ASWCNScannerBridge(baseUrl));
    const serviceAvailable = ref(null);
    const sources = ref([]);
    const scanning = ref(false);
    const error = ref(null);

    async function checkStatus() {
        try {
            serviceAvailable.value = await scanner.value.checkServiceStatus();
        } catch (err) {
            serviceAvailable.value = false;
            error.value = err.message;
        }
        return serviceAvailable.value;
    }

    async function refreshSources() {
        try {
            sources.value = await scanner.value.getSources();
        } catch (err) {
            error.value = err.message;
        }
    }

    async function scan(sourceName, params = {}) {
        scanning.value = true;
        error.value = null;
        try {
            await scanner.value.openSource(sourceName);
            const images = await scanner.value.scan(params);
            await scanner.value.closeSource();
            return images;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            scanning.value = false;
        }
    }

    return { checkStatus, refreshSources, scan, serviceAvailable, sources, scanning, error };
}
```

**Component usage:**

```vue
<template>
    <div>
        <p>Service: {{ serviceAvailable ? 'Online' : 'Offline' }}</p>
        <button @click="handleScan" :disabled="scanning || !sources.length">
            {{ scanning ? 'Scanning...' : 'Scan' }}
        </button>
        <p v-if="error" style="color: red">{{ error }}</p>
        <img v-for="(src, i) in images" :key="i" :src="src" :alt="'Page ' + (i + 1)" />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useScanner } from '@/composables/useScanner';

const { checkStatus, refreshSources, scan, serviceAvailable, sources, scanning, error } = useScanner();
const images = ref([]);

onMounted(async () => {
    if (await checkStatus()) await refreshSources();
});

async function handleScan() {
    if (!sources.value.length) return;
    const result = await scan(sources.value[0].name, { resolution: 300, colorMode: 'Color' });
    images.value = result.map(i => `data:${i.mimeType};base64,${i.base64Data}`);
}
</script>
```

**CSP:** Set via your deployment server's response headers (nginx, Caddy, etc.) or Vite plugin for development.

---

### Next.js

Scanner access is **browser-only** — use a Client Component.

**Include the SDK** in `public/js/aswcn-scanner-bridge.js`.

**Add script** using `next/script` in your layout or page:

```jsx
// app/layout.js
import Script from 'next/script';

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                {children}
                <Script src="/js/aswcn-scanner-bridge.js" strategy="beforeInteractive" />
            </body>
        </html>
    );
}
```

**Client Component** (`app/components/Scanner.jsx`):

```jsx
'use client';

import { useState, useEffect, useRef } from 'react';

export default function Scanner() {
    const scannerRef = useRef(null);
    const [sources, setSources] = useState([]);
    const [images, setImages] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [status, setStatus] = useState('checking');

    useEffect(() => {
        scannerRef.current = new window.ASWCNScannerBridge('https://localhost:53052');
        scannerRef.current.checkServiceStatus().then(ok => {
            setStatus(ok ? 'online' : 'offline');
            if (ok) scannerRef.current.getSources().then(setSources);
        });
    }, []);

    const handleScan = async () => {
        if (!sources.length) return;
        setScanning(true);
        try {
            await scannerRef.current.openSource(sources[0].name);
            const result = await scannerRef.current.scan({ resolution: 300, colorMode: 'Color' });
            setImages(result.map(i => `data:${i.mimeType};base64,${i.base64Data}`));
            await scannerRef.current.closeSource();
        } finally {
            setScanning(false);
        }
    };

    return (
        <div>
            <p>Scanner service: {status}</p>
            <button onClick={handleScan} disabled={scanning || !sources.length}>
                {scanning ? 'Scanning...' : 'Scan Document'}
            </button>
            {images.map((src, i) => <img key={i} src={src} alt={`Page ${i + 1}`} />)}
        </div>
    );
}
```

**CSP** in `next.config.js`:

```javascript
const nextConfig = {
    async headers() {
        return [{
            source: '/(.*)',
            headers: [{
                key: 'Content-Security-Policy',
                value: "default-src 'self'; connect-src 'self' https://localhost:53052; script-src 'self' 'unsafe-eval'; img-src 'self' data:;"
            }]
        }];
    }
};
module.exports = nextConfig;
```

---

### SvelteKit

Scanner access is browser-only — guard with `onMount` or the `browser` check.

**Include the SDK** in `static/js/aswcn-scanner-bridge.js`.

**Add script** in `src/app.html`:

```html
<script src="/js/aswcn-scanner-bridge.js"></script>
```

**Svelte component** (`src/routes/scan/+page.svelte`):

```svelte
<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let scanner;
    let sources = [];
    let images = [];
    let scanning = false;
    let status = 'checking';

    onMount(async () => {
        if (!browser) return;
        scanner = new window.ASWCNScannerBridge('https://localhost:53052');
        const ok = await scanner.checkServiceStatus();
        status = ok ? 'online' : 'offline';
        if (ok) sources = await scanner.getSources();
    });

    async function handleScan() {
        if (!sources.length) return;
        scanning = true;
        try {
            await scanner.openSource(sources[0].name);
            const result = await scanner.scan({ resolution: 300, colorMode: 'Color' });
            images = result.map(i => `data:${i.mimeType};base64,${i.base64Data}`);
            await scanner.closeSource();
        } finally {
            scanning = false;
        }
    }
</script>

<p>Scanner service: {status}</p>
<button on:click={handleScan} disabled={scanning || !sources.length}>
    {scanning ? 'Scanning...' : 'Scan Document'}
</button>
{#each images as src, i}
    <img {src} alt="Page {i + 1}" />
{/each}
```

**CSP** in `svelte.config.js` via adapter configuration, or set in your deployment server's response headers.

---

### Django

**Include the SDK** as a static file:

```
myapp/static/js/aswcn-scanner-bridge.js
```

**Template usage:**

```html
{% load static %}
<script src="{% static 'js/aswcn-scanner-bridge.js' %}"></script>
```

**CSP** with `django-csp` middleware:

```bash
pip install django-csp
```

```python
# settings.py
MIDDLEWARE = [
    # ...
    'csp.middleware.CSPMiddleware',
]

CSP_DEFAULT_SRC = ("'self'",)
CSP_CONNECT_SRC = ("'self'", "https://localhost:53052")
CSP_SCRIPT_SRC = ("'self'",)
CSP_IMG_SRC = ("'self'", "data:")
```

Or without the package, set headers in middleware:

```python
# middleware.py
class ScannerCSPMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "connect-src 'self' https://localhost:53052; "
            "script-src 'self'; "
            "img-src 'self' data:;"
        )
        return response
```

**Template with scanning:**

```html
{% load static %}
<!DOCTYPE html>
<html>
<head>
    <script src="{% static 'js/aswcn-scanner-bridge.js' %}"></script>
</head>
<body>
    <button onclick="scanDocument()">Scan</button>
    <div id="results"></div>

    <script>
        const scanner = new ASWCNScannerBridge('https://localhost:53052');

        async function scanDocument() {
            if (!await scanner.checkServiceStatus()) {
                alert('Scanner service not available');
                return;
            }
            const sources = await scanner.getSources();
            await scanner.openSource(sources[0].name);
            const images = await scanner.scan({ resolution: 300, colorMode: 'Color' });
            const container = document.getElementById('results');
            images.forEach(img => {
                const el = document.createElement('img');
                el.src = `data:${img.mimeType};base64,${img.base64Data}`;
                container.appendChild(el);
            });
            await scanner.closeSource();
        }
    </script>
</body>
</html>
```

---

### Ruby on Rails

**Include the SDK.** For importmap-rails (Rails 7+):

```bash
# Copy to app/javascript/vendor/
cp aswcn-scanner-bridge.js app/javascript/vendor/
```

```ruby
# config/importmap.rb
pin "aswcn-scanner-bridge", to: "vendor/aswcn-scanner-bridge.js"
```

Or with the asset pipeline, place in `app/assets/javascripts/` and add to `application.js`:

```javascript
//= require aswcn-scanner-bridge
```

Or simply add to the layout:

```erb
<%# app/views/layouts/application.html.erb %>
<script src="<%= asset_path('aswcn-scanner-bridge.js') %>"></script>
```

**CSP** in `config/initializers/content_security_policy.rb`:

```ruby
Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self
    policy.connect_src :self, "https://localhost:53052"
    policy.script_src  :self
    policy.img_src     :self, :data
  end
end
```

**Usage in a view:**

```erb
<%# app/views/scans/index.html.erb %>
<button onclick="scanDocument()">Scan Document</button>
<div id="results"></div>

<script>
    const scanner = new ASWCNScannerBridge('https://localhost:53052');

    async function scanDocument() {
        if (!await scanner.checkServiceStatus()) {
            alert('Scanner service not available');
            return;
        }
        const sources = await scanner.getSources();
        await scanner.openSource(sources[0].name);
        const images = await scanner.scan({ resolution: 300, colorMode: 'Color' });
        document.getElementById('results').innerHTML =
            images.map(i => `<img src="data:${i.mimeType};base64,${i.base64Data}" />`).join('');
        await scanner.closeSource();
    }
</script>
```

---

### Spring Boot (Thymeleaf)

**Include the SDK** as a static resource:

```
src/main/resources/static/js/aswcn-scanner-bridge.js
```

**CSP** via Spring Security:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "connect-src 'self' https://localhost:53052; " +
                        "script-src 'self'; " +
                        "img-src 'self' data:;"
                    )
                )
            )
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
```

**Thymeleaf template:**

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <script th:src="@{/js/aswcn-scanner-bridge.js}"></script>
</head>
<body>
    <button onclick="scanDocument()">Scan Document</button>
    <div id="results"></div>

    <script>
        const scanner = new ASWCNScannerBridge('https://localhost:53052');

        async function scanDocument() {
            if (!await scanner.checkServiceStatus()) {
                alert('Scanner service not available');
                return;
            }
            const sources = await scanner.getSources();
            await scanner.openSource(sources[0].name);
            const images = await scanner.scan({ resolution: 300, colorMode: 'Color' });
            document.getElementById('results').innerHTML =
                images.map(i => '<img src="data:' + i.mimeType + ';base64,' + i.base64Data + '" />').join('');
            await scanner.closeSource();
        }
    </script>
</body>
</html>
```

## Common Pitfalls

### Mixed Content

If your site is served over `http://`, the browser will block requests to `https://localhost:53052` as mixed content. **Always serve your web app over HTTPS.**

### CSP Blocking

The most common integration failure. If `fetch` calls to the scanner silently fail, check the browser console for CSP violations. Add `https://localhost:53052` to `connect-src` and `data:` to `img-src`.

### Certificate Warnings

The self-signed certificate is installed to the Windows trusted store, but some browsers (especially Firefox) maintain their own certificate store. Users should visit `https://localhost:53052/health` and accept the certificate once. In enterprise deployments, push the certificate via Group Policy.

### Blazor JS Interop Gotchas

- `IJSRuntime.InvokeAsync<T>` deserializes JS objects into `T` — use `JsonElement` if the shape varies
- Long-running scans may exceed Blazor's default JS interop timeout. Increase it: `builder.Services.AddServerSideBlazor(o => o.JSInteropDefaultCallTimeout = TimeSpan.FromMinutes(5));`
- In Blazor Server, JS interop goes over the SignalR circuit — large Base64 images can hit the message size limit. Increase it: `builder.Services.AddSignalR(o => o.MaximumReceiveMessageSize = 100 * 1024 * 1024);`

### Large Payloads

Scanned images are Base64-encoded in JSON. A single 300 DPI color letter-size page is ~3-5 MB in Base64. Duplex multi-page scans produce proportionally larger payloads. Plan your UI accordingly (show loading indicators, stream pages if possible).

### Service Not Installed

The scanner service is installed per-machine. Your web app should always check `checkServiceStatus()` first and show a helpful message directing users to install AmbirScan Web Connect if the service is not available.

### Scanner Already Open

Only one application can have a TWAIN scanner open at a time. If `openSource()` fails, the scanner may be in use by another application. Always call `closeSource()` when done, even on errors — use `try/finally`.
