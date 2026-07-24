# Framework Integration Guide

How to integrate AmbirScan Web Connect into popular web frameworks. The scanner SDK is a **client-side JavaScript file** — your server only needs to serve it and set the correct Content Security Policy headers.

> **Key concept:** Your server never talks to the scanner service directly. The browser's JavaScript calls `https://localhost:53052` via the SDK. Your server just needs to:
> 1. Serve the SDK JS file
> 2. Allow `connect-src https://localhost:53052` in CSP headers
> 3. Allow `img-src data:` in CSP headers (for displaying scanned images)

For SDK method reference, see the [README](README.md#sdk-reference). For REST API details, see [docs/rest-api.md](docs/rest-api.md).

## Table of Contents

- [Common Setup (All Frameworks)](#common-setup-all-frameworks)
- [ASP.NET Core (Razor Pages / MVC)](#aspnet-core-razor-pages--mvc)
- [Blazor (Server & WebAssembly)](#blazor-server--webassembly)
- [Angular](#angular)
- [React](#react)
- [Vue.js](#vuejs)
- [Next.js](#nextjs)
- [SvelteKit](#sveltekit)
- [Django](#django)
- [Ruby on Rails](#ruby-on-rails)
- [Spring Boot (Thymeleaf)](#spring-boot-thymeleaf)
- [Common Pitfalls](#common-pitfalls)

---

## Common Setup (All Frameworks)

### Content Security Policy

If your app sets CSP headers (most production apps should), you **must** allow connections to the scanner service. Without this, the browser will silently block `fetch` calls.

```
Content-Security-Policy: default-src 'self'; connect-src 'self' https://localhost:53052; img-src 'self' data:;
```

- `connect-src https://localhost:53052` — allows the SDK to call the scanner service
- `img-src data:` — allows displaying scanned images as Base64 data URIs

### CORS and Private Network Access

No configuration needed on your server. CORS is between the browser and `localhost:53052` — the scanner service handles it automatically. See [CORS and Browser Security](README.md#cors-and-browser-security) in the README.

---

## ASP.NET Core (Razor Pages / MVC)

### Include the SDK

Copy `aswcn-scanner-bridge.js` to `wwwroot/js/` and add the script tag in `Views/Shared/_Layout.cshtml`:

```html
<script src="~/js/aswcn-scanner-bridge.js"></script>
```

### CSP Configuration

Add CSP middleware in `Program.cs`:

```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers.Append(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "connect-src 'self' https://localhost:53052; " +
        "script-src 'self'; " +
        "img-src 'self' data:;");
    await next();
});
```

### Usage in a Razor View

```html
@section Scripts {
<script>
    const scanner = new ASWCNScannerBridge('https://localhost:53052');

    async function scanDocument() {
        if (!await scanner.checkServiceStatus()) {
            alert('Scanner service not available');
            return;
        }
        const sources = await scanner.getSources();
        await scanner.openSource(sources[0].name);
        try {
            const images = await scanner.scan({ resolution: 300, colorMode: 'Color' });
            images.forEach(img => {
                document.getElementById('scanResults').innerHTML +=
                    `<img src="data:${img.mimeType};base64,${img.base64Data}" />`;
            });
        } finally {
            await scanner.closeSource();
        }
    }
</script>
}

<button onclick="scanDocument()">Scan Document</button>
<div id="scanResults"></div>
```

---

## Blazor (Server & WebAssembly)

Blazor cannot call JavaScript directly — use `IJSRuntime` interop.

### Include the SDK

Copy to `wwwroot/js/aswcn-scanner-bridge.js`. Add the script tag in `wwwroot/index.html` (WASM) or `Pages/_Host.cshtml` (Server):

```html
<script src="js/aswcn-scanner-bridge.js"></script>
```

### JS Interop Bridge

Create `wwwroot/js/scanner-interop.js`:

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

### C# Wrapper Service

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

Register in `Program.cs`:

```csharp
builder.Services.AddScoped<ScannerService>();
```

### Razor Component

```razor
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
        try {
            var images = await Scanner.ScanAsync(new { resolution = 300, colorMode = "Color" });
            foreach (var img in images)
            {
                var data = img.GetProperty("base64Data").GetString();
                var mime = img.GetProperty("mimeType").GetString();
                _images.Add($"data:{mime};base64,{data}");
            }
        } finally {
            await Scanner.CloseSourceAsync();
        }
    }
}
```

> **Blazor Gotchas:**
> - **JS interop timeout:** Long scans may exceed the default timeout. Increase it:
>   ```csharp
>   builder.Services.AddServerSideBlazor(o => o.JSInteropDefaultCallTimeout = TimeSpan.FromMinutes(5));
>   ```
> - **SignalR message size (Blazor Server only):** Large Base64 images can hit the message size limit:
>   ```csharp
>   builder.Services.AddSignalR(o => o.MaximumReceiveMessageSize = 100 * 1024 * 1024);
>   ```
> - **Deserialization:** Use `JsonElement` for JS interop return types when the shape varies.

---

## Angular

### Include the SDK

Place `aswcn-scanner-bridge.js` in `src/assets/js/` and add to `angular.json`:

```json
"scripts": ["src/assets/js/aswcn-scanner-bridge.js"]
```

Or add the script tag directly to `src/index.html`:

```html
<script src="assets/js/aswcn-scanner-bridge.js"></script>
```

### Type Declaration

Create `src/types/aswcn.d.ts`:

```typescript
declare class ASWCNScannerBridge {
    constructor(baseUrl?: string | null);
    checkServiceStatus(): Promise<boolean>;
    getSources(): Promise<Array<{
        name: string; manufacturer: string; model: string;
        isOnline: boolean; hasFeeder: boolean; hasFlatbed: boolean;
        supportsDuplex: boolean;
    }>>;
    openSource(sourceName: string): Promise<any>;
    closeSource(): Promise<any>;
    getCapabilities(sourceName: string): Promise<{
        resolutions: number[]; colorModes: string[];
        supportsDuplex: boolean; supportsAutoRotate: boolean;
        supportsAutoDeskew: boolean; supportsAutoCrop: boolean;
        supportedPageSizes: string[];
    }>;
    getStatus(): Promise<{
        isOnline: boolean; isPaperLoaded: boolean;
        isSourceOpen: boolean; ocrEnabled: boolean;
    }>;
    scan(params?: {
        resolution?: number; colorMode?: string;
        duplexMode?: string; pageSize?: string;
        autoRotate?: boolean; autoDeskew?: boolean;
        autoCrop?: boolean; outputFormat?: string;
        barcodeReadingEnabled?: boolean;
        barcodeFilterLevel?: string;
        ocrEnabled?: boolean;
        requestTimeoutSeconds?: number;
    }): Promise<Array<{
        base64Data: string; mimeType: string;
        pageNumber: number; width: number; height: number;
        resolution: number; format: string; fileSizeBytes: number;
        ocrText: string;
        barcodes: Array<{ text: string; barcodeType: string; confidence: number }>;
    }>>;
    checkPaperLoaded(): Promise<boolean>;
    checkScannerOnline(): Promise<boolean>;
    sendCommand(method: string, params?: any): Promise<any>;
}
```

### Angular Service

```typescript
import { Injectable } from '@angular/core';

declare var ASWCNScannerBridge: any;

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

### Component

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
            const images = await this.scannerService.scan({
                resolution: 300, colorMode: 'Color'
            });
            this.scannedImages = images.map(
                (i: any) => `data:${i.mimeType};base64,${i.base64Data}`
            );
            await this.scannerService.closeSource();
        } finally {
            this.scanning = false;
        }
    }
}
```

**CSP:** Configure in your deployment server's response headers (nginx, IIS, etc.).

---

## React

### Include the SDK

Place `aswcn-scanner-bridge.js` in `public/js/` and add to `public/index.html`:

```html
<script src="%PUBLIC_URL%/js/aswcn-scanner-bridge.js"></script>
```

For Vite-based React, place in `public/js/` and add to `index.html`:

```html
<script src="/js/aswcn-scanner-bridge.js"></script>
```

### Custom Hook

Create `src/hooks/useScannerBridge.js`:

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

    return {
        checkStatus, refreshSources, scan,
        serviceAvailable, sources, scanning, error
    };
}
```

### Component

```jsx
import { useEffect, useState } from 'react';
import { useScannerBridge } from './hooks/useScannerBridge';

function ScanPage() {
    const { checkStatus, refreshSources, scan,
            serviceAvailable, sources, scanning, error } = useScannerBridge();
    const [images, setImages] = useState([]);

    useEffect(() => {
        checkStatus().then(ok => ok && refreshSources());
    }, []);

    const handleScan = async () => {
        if (!sources.length) return;
        const result = await scan(sources[0].name, {
            resolution: 300, colorMode: 'Color'
        });
        setImages(result.map(i => `data:${i.mimeType};base64,${i.base64Data}`));
    };

    return (
        <div>
            <p>Service: {serviceAvailable ? 'Online' : 'Offline'}</p>
            <button onClick={handleScan} disabled={scanning || !sources.length}>
                {scanning ? 'Scanning...' : 'Scan'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {images.map((src, i) => (
                <img key={i} src={src} alt={`Page ${i + 1}`} />
            ))}
        </div>
    );
}
```

**CSP:** Set via your server's response headers, or with a `<meta>` tag for development:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; connect-src 'self' https://localhost:53052; img-src 'self' data:;" />
```

---

## Vue.js

### Include the SDK

Place `aswcn-scanner-bridge.js` in `public/js/` and add to `index.html`:

```html
<script src="/js/aswcn-scanner-bridge.js"></script>
```

### Composable

Create `src/composables/useScanner.js`:

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

    return {
        checkStatus, refreshSources, scan,
        serviceAvailable, sources, scanning, error
    };
}
```

### Component

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

const { checkStatus, refreshSources, scan,
        serviceAvailable, sources, scanning, error } = useScanner();
const images = ref([]);

onMounted(async () => {
    if (await checkStatus()) await refreshSources();
});

async function handleScan() {
    if (!sources.value.length) return;
    const result = await scan(sources.value[0].name, {
        resolution: 300, colorMode: 'Color'
    });
    images.value = result.map(i => `data:${i.mimeType};base64,${i.base64Data}`);
}
</script>
```

**CSP:** Set via your deployment server's response headers (nginx, Caddy, etc.).

---

## Next.js

Scanner access is **browser-only** — use a Client Component with `'use client'`.

### Include the SDK

Place `aswcn-scanner-bridge.js` in `public/js/`. Add via `next/script` in your layout:

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

### Client Component

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
            const result = await scannerRef.current.scan({
                resolution: 300, colorMode: 'Color'
            });
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

### CSP in `next.config.js`

```javascript
const nextConfig = {
    async headers() {
        return [{
            source: '/(.*)',
            headers: [{
                key: 'Content-Security-Policy',
                value: [
                    "default-src 'self'",
                    "connect-src 'self' https://localhost:53052",
                    "script-src 'self' 'unsafe-eval'",
                    "img-src 'self' data:"
                ].join('; ') + ';'
            }]
        }];
    }
};
module.exports = nextConfig;
```

---

## SvelteKit

Scanner access is browser-only — guard with `onMount` or the `browser` check.

### Include the SDK

Place `aswcn-scanner-bridge.js` in `static/js/`. Add to `src/app.html`:

```html
<script src="/js/aswcn-scanner-bridge.js"></script>
```

### Component

```svelte
<!-- src/routes/scan/+page.svelte -->
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
            const result = await scanner.scan({
                resolution: 300, colorMode: 'Color'
            });
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

**CSP:** Configure via SvelteKit hooks or your deployment server's response headers.

---

## Django

### Include the SDK

Copy `aswcn-scanner-bridge.js` to your static files directory:

```
myapp/static/js/aswcn-scanner-bridge.js
```

Reference in templates:

```html
{% load static %}
<script src="{% static 'js/aswcn-scanner-bridge.js' %}"></script>
```

### CSP with django-csp

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

### Template

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
            try {
                const images = await scanner.scan({
                    resolution: 300, colorMode: 'Color'
                });
                const container = document.getElementById('results');
                images.forEach(img => {
                    const el = document.createElement('img');
                    el.src = `data:${img.mimeType};base64,${img.base64Data}`;
                    container.appendChild(el);
                });
            } finally {
                await scanner.closeSource();
            }
        }
    </script>
</body>
</html>
```

---

## Ruby on Rails

### Include the SDK

For importmap-rails (Rails 7+):

```ruby
# config/importmap.rb
pin "aswcn-scanner-bridge", to: "vendor/aswcn-scanner-bridge.js"
```

Or simply add to your layout:

```erb
<%# app/views/layouts/application.html.erb %>
<script src="<%= asset_path('aswcn-scanner-bridge.js') %>"></script>
```

### CSP Configuration

```ruby
# config/initializers/content_security_policy.rb
Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self
    policy.connect_src :self, "https://localhost:53052"
    policy.script_src  :self
    policy.img_src     :self, :data
  end
end
```

### View

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
        try {
            const images = await scanner.scan({
                resolution: 300, colorMode: 'Color'
            });
            document.getElementById('results').innerHTML =
                images.map(i =>
                    `<img src="data:${i.mimeType};base64,${i.base64Data}" />`
                ).join('');
        } finally {
            await scanner.closeSource();
        }
    }
</script>
```

---

## Spring Boot (Thymeleaf)

### Include the SDK

Place `aswcn-scanner-bridge.js` in:

```
src/main/resources/static/js/aswcn-scanner-bridge.js
```

### CSP via Spring Security

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

### Thymeleaf Template

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
            try {
                const images = await scanner.scan({
                    resolution: 300, colorMode: 'Color'
                });
                document.getElementById('results').innerHTML =
                    images.map(function(i) {
                        return '<img src="data:' + i.mimeType +
                               ';base64,' + i.base64Data + '" />';
                    }).join('');
            } finally {
                await scanner.closeSource();
            }
        }
    </script>
</body>
</html>
```

---

## Common Pitfalls

### Mixed Content

If your site is served over `http://`, the browser will block requests to `https://localhost:53052`. Always serve your web app over HTTPS in production.

### CSP Blocking

The most common integration failure. If `fetch` calls to the scanner silently fail with no network errors, check the browser console for CSP violation messages.

### Certificate Warnings

The self-signed certificate is installed to the Windows trusted store, which Chrome and Edge honor automatically. Firefox maintains its own (NSS) certificate store and does not read the Windows store by default, so it needs one extra step: either set `security.enterprise_roots.enabled` to `true` (so Firefox also trusts the OS store — recommended, and pushable via enterprise policy for managed fleets), or have users visit `https://localhost:53052/health` and accept the certificate manually.

### Large Payloads

Scanned images are Base64-encoded in JSON. A single 300 DPI color letter-size page is approximately 3-5 MB in Base64. Plan your UI accordingly — show loading indicators and consider processing pages as they arrive.

### Scanner Already Open

Only one application can have a TWAIN scanner open at a time. Always call `closeSource()` when done, even on errors — use `try/finally`.

### Service Not Installed

Always check `checkServiceStatus()` first and show a helpful message directing users to install AmbirScan Web Connect if the service is not available.
