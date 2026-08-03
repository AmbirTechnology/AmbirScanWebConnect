# AmbirScan Web Connect

AmbirScan Web Connect enables web applications to control local TWAIN scanners through a simple JavaScript SDK. It bridges the gap between browser-based applications and hardware scanners by providing a local Windows service that your web app communicates with via REST API.

## How It Works

```
┌──────────────────┐    HTTPS (REST API)    ┌────────────────────────┐    Internal    ┌─────────────┐
│   Your Web App   │ ←────────────────────→ │  AmbirScan Web Connect │ ←───────────→ │   Scanner   │
│   (Browser)      │   localhost:53052      │  (Windows Service +    │    TWAIN      │   Hardware  │
│                  │                        │   Desktop App)         │               │             │
└──────────────────┘                        └────────────────────────┘               └─────────────┘
```

1. Your web application includes the JavaScript SDK (`aswcn-scanner-bridge.js`)
2. The SDK communicates with the locally installed AmbirScan Web Connect service over HTTPS on `localhost:53052`
3. The service interfaces with TWAIN scanners and returns scanned images as Base64-encoded data

## Try It Now

Want to test scanning without building your own web app? A hosted demo is available:

1. **[Download and install AmbirScan Web Connect](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScanWebConnect_4.0.0.14.exe)**
2. **Browse to [https://ambirscanwebconnect.azurewebsites.net](https://ambirscanwebconnect.azurewebsites.net)**
3. **Select your scanner and scan** — the web app communicates with the scanner service running on your machine

This is the fastest way to verify your installation is working before integrating the SDK into your own application.

## Quick Start

### 1. Install AmbirScan Web Connect

[Download the installer](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScanWebConnect_4.0.0.14.exe) and run it on each client machine that has a scanner connected.

The installer will set up:
- **AmbirScan Web Connect Service** — HTTPS REST API on `localhost:53052`
- **AmbirScan Web Connect Desktop App** — TWAIN scanner interface (runs in the system tray)
- **Self-signed HTTPS certificate** — Automatically installed and trusted

> **Note:** The installer requires Administrator privileges for certificate and service installation.

### 2. Add the JavaScript SDK to Your Web App

Copy `sdk/js/aswcn-scanner-bridge.js` into your web application, or reference it directly:

```html
<script src="path/to/aswcn-scanner-bridge.js"></script>
```

### 3. Use the SDK

```javascript
// Initialize the scanner bridge
const scanner = new ASWCNScannerBridge();

// Check if the service is running
const isAvailable = await scanner.checkServiceStatus();
if (!isAvailable) {
    console.error('AmbirScan Web Connect is not running');
    return;
}

// Get available scanners
const sources = await scanner.getSources();
console.log('Available scanners:', sources);

// Open a scanner
await scanner.openSource(sources[0].name);

// Get scanner capabilities
const capabilities = await scanner.getCapabilities(sources[0].name);
console.log('Capabilities:', capabilities);

// Scan a document
const images = await scanner.scan({
    resolution: 200,
    colorMode: 'Grayscale',
    duplexMode: 'Simplex',
    pageSize: 'Letter',
    autoRotate: false,
    autoDeskew: true,
    autoCrop: true,
    outputFormat: 'png'
});

// Display scanned images
images.forEach(image => {
    const img = document.createElement('img');
    img.src = `data:${image.mimeType};base64,${image.base64Data}`;
    document.body.appendChild(img);
});

// Close the scanner when done
await scanner.closeSource();
```

## Deployment Guide

### System Requirements

- **OS:** Windows 10 or later (64-bit)
- **Browser:** Chrome 90+, Edge 90+, or any modern Chromium-based browser (Firefox 90+ is supported with [additional certificate setup](https://github.com/AmbirTechnology/AmbirScanWebConnect))
- **Scanner:** Any TWAIN-compatible scanner
- **.NET Runtime:** .NET 8 Runtime (included in the installer)

### Installation Steps

1. **[Download the installer](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScanWebConnect_4.0.0.14.exe)**
2. **Run the installer** as Administrator
3. **Complete the setup wizard** — the installer will:
   - Install the Windows Service and Desktop Application
   - Generate and install a self-signed HTTPS certificate
   - Configure Windows Firewall rules for `localhost:53052`
   - Register the Windows Service for automatic startup
4. **Verify installation:**
   - The Desktop App icon should appear in the Windows system tray
   - Navigate to `https://localhost:53052/health` in your browser — you should see a health check response

### Verifying the Installation

Open a browser and navigate to:

```
https://localhost:53052/health
```

You should see a JSON response indicating the service is healthy. If you see a certificate warning, accept it — the self-signed certificate is safe for localhost use.

You can also use the included diagnostic page (`sample-app/scanner-diagnostic.html`) to test the full scanning pipeline.

### Uninstallation

Use **Windows Add/Remove Programs** (Settings > Apps > Installed apps) to uninstall AmbirScan Web Connect. The uninstaller will remove the service, desktop app, certificate, and firewall rules.

### Silent/Unattended Installation

For enterprise deployment, the installer supports silent mode:

```cmd
AmbirScanWebConnect.msi /quiet /norestart
```

## SDK Reference

### `ASWCNScannerBridge` Class

#### Constructor

```javascript
const scanner = new ASWCNScannerBridge(baseUrl);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `baseUrl` | `string` | `null` | Service URL. If `null`, defaults to `https://localhost:53052` |

#### Methods

##### `checkServiceStatus()`

Check if the AmbirScan Web Connect service and desktop app are running.

```javascript
const isAvailable = await scanner.checkServiceStatus();
// Returns: boolean
```

##### `getSources()`

Get a list of available TWAIN scanners.

```javascript
const sources = await scanner.getSources();
// Returns: Array<{ name, manufacturer, model, isOnline, hasFeeder, hasFlatbed, supportsDuplex }>
```

##### `openSource(sourceName)`

Open a scanner for scanning operations. Must be called before `scan()`.

```javascript
await scanner.openSource('Scanner Name');
```

##### `closeSource()`

Close the currently open scanner. Call this when done scanning.

```javascript
await scanner.closeSource();
```

##### `getCapabilities(sourceName)`

Get the capabilities of a specific scanner.

```javascript
const capabilities = await scanner.getCapabilities('Scanner Name');
// Returns: {
//   resolutions: number[],        // e.g., [150, 200, 300, 600]
//   colorModes: string[],         // e.g., ['Color', 'Grayscale', 'BlackAndWhite']
//   supportsDuplex: boolean,
//   supportsAutoRotate: boolean,
//   supportsAutoDeskew: boolean,
//   supportsAutoCrop: boolean,
//   supportedPageSizes: string[]   // e.g., ['Letter', 'Legal', 'A4', 'Auto']
// }
```

##### `getStatus()`

Get the current scanner status.

```javascript
const status = await scanner.getStatus();
// Returns: { isOnline, isPaperLoaded, isSourceOpen, ocrEnabled }
```

##### `scan(params)`

Perform a scan with the specified parameters. A scanner must be opened first with `openSource()`.

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
    barcodeFilterLevel: 'Normal'
});
```

**Scan Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `resolution` | `number` | `200` | Scan resolution in DPI |
| `colorMode` | `string` | `'Grayscale'` | `'Color'`, `'Grayscale'`, or `'BlackAndWhite'` |
| `duplexMode` | `string` | `'Simplex'` | `'Simplex'`, `'DuplexLongEdge'`, or `'DuplexShortEdge'` |
| `pageSize` | `string` | `'Letter'` | `'Letter'`, `'Legal'`, `'A4'`, `'A5'`, `'Auto'`, etc. |
| `autoRotate` | `boolean` | `false` | Auto-rotate pages to correct orientation |
| `autoDeskew` | `boolean` | `true` | Auto-straighten skewed pages |
| `autoCrop` | `boolean` | `true` | Auto-crop to page edges |
| `outputFormat` | `string` | `'png'` | Output image format: `'png'`, `'jpeg'`, `'bmp'`, `'tiff'` |
| `barcodeReadingEnabled` | `boolean` | `false` | Enable barcode detection on scanned images |
| `barcodeFilterLevel` | `string` | `'Normal'` | `'Low'`, `'Normal'`, `'High'`, or `'VeryHigh'` |
| `ocrEnabled` | `boolean` | `false` | Enable OCR text extraction |
| `requestTimeoutSeconds` | `number` | `0` | Timeout in seconds (0 = no timeout) |

**Response — Scanned Images:**

Each image in the returned array contains:

| Field | Type | Description |
|-------|------|-------------|
| `base64Data` | `string` | Base64-encoded image data |
| `mimeType` | `string` | MIME type (e.g., `image/png`) |
| `pageNumber` | `number` | Page number (1-based) |
| `width` | `number` | Image width in pixels |
| `height` | `number` | Image height in pixels |
| `resolution` | `number` | Actual scan resolution in DPI |
| `format` | `string` | Image format |
| `fileSizeBytes` | `number` | Image file size in bytes |
| `ocrText` | `string` | Extracted OCR text (if OCR enabled) |
| `barcodes` | `array` | Detected barcodes (if barcode reading enabled) |

**Barcode Result Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Decoded barcode text |
| `barcodeType` | `string` | Barcode format (e.g., `CODE_128`, `PDF_417`, `QR_CODE`) |
| `confidence` | `number` | Confidence score (0.0 - 1.0) |
| `isAamva` | `boolean` | `true` if barcode contains AAMVA driver's license data |
| `parsedData` | `string` | Parsed AAMVA data (when `isAamva` is `true`) |

##### `checkPaperLoaded()`

Check if paper is loaded in the scanner feeder.

```javascript
const hasPaper = await scanner.checkPaperLoaded();
// Returns: boolean
```

##### `checkScannerOnline()`

Check if the scanner is online and connected.

```javascript
const isOnline = await scanner.checkScannerOnline();
// Returns: boolean
```

## REST API Reference

If you prefer to use the REST API directly instead of the JavaScript SDK, the service exposes the following endpoints on `https://localhost:53052`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/twain` | TWAIN Direct protocol endpoint (used by the SDK) |
| `GET` | `/api/twain/scanners` | List available scanners |
| `GET` | `/api/twain/scanners/{name}/capabilities` | Get scanner capabilities |
| `GET` | `/api/twain/status` | Get service and scanner status |
| `POST` | `/api/twain/scan` | Simplified scan endpoint |
| `POST` | `/api/twain/cancel` | Cancel an active scan |
| `GET` | `/health` | Health check |

See [docs/rest-api.md](docs/rest-api.md) for detailed REST API documentation.

## Sample Application

The `sample-app/` directory contains a complete working example:

- **`scanner-demo.html`** — Full-featured scanning demo with scanner selection, capabilities, scan parameters, image display, and barcode results
- **`scanner-diagnostic.html`** — Diagnostic tool for testing individual API calls and troubleshooting

To use the sample app, serve the files with any web server (or open them directly) and ensure AmbirScan Web Connect is installed and running.

## Framework Integration

For detailed integration guides for specific web frameworks, see **[FRAMEWORK-INTEGRATION.md](FRAMEWORK-INTEGRATION.md)**. It covers:

- **ASP.NET Core (Razor Pages / MVC)** — Script tag in `_Layout.cshtml`, CSP middleware
- **Blazor (Server & WebAssembly)** — JS interop via `IJSRuntime`, wrapper service class
- **Angular** — TypeScript service, type declarations, `angular.json` scripts
- **React** — Custom hook (`useScannerBridge`), Vite and CRA setup
- **Vue.js** — Composable (`useScanner`), `index.html` script include
- **Next.js** — Client Component with `'use client'`, `next/script`
- **SvelteKit** — `onMount` for browser-only code, `browser` check
- **Django** — Static file, template tag, `django-csp` middleware
- **Ruby on Rails** — Asset pipeline or importmap, CSP initializer
- **Spring Boot (Thymeleaf)** — Static resource, Spring Security CSP

Each guide includes how to include the SDK, CSP configuration, an idiomatic wrapper pattern, and a working example.

## CORS and Browser Security

AmbirScan Web Connect is configured to accept requests from any origin on localhost. This is safe because the service only binds to `127.0.0.1` and is not accessible from the network.

### Chrome Private Network Access

Chrome 90+ includes Private Network Access (PNA) security which requires special handling for requests from public websites to localhost. AmbirScan Web Connect automatically handles PNA preflight requests — no additional configuration is needed on your part.

### HTTPS Certificate

The service uses a self-signed certificate. On first connection, your users may see a certificate warning in their browser. The installer adds the certificate to the Windows trusted certificate store, so in most cases the browser will trust it automatically.

If users encounter certificate issues, they can navigate to `https://localhost:53052/health` and accept the certificate manually.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Service not responding | Check that both the Windows Service and Desktop App are running (system tray icon) |
| Certificate warning | Navigate to `https://localhost:53052/health` and accept the certificate |
| No scanners found | Ensure a TWAIN-compatible scanner is connected and its drivers are installed |
| Scan timeout | Increase `requestTimeoutSeconds` parameter or check scanner hardware |
| CORS errors | Ensure you're using `mode: 'cors'` in fetch requests (the SDK handles this automatically) |

## Supported Barcode Formats

When `barcodeReadingEnabled` is set to `true`, the following barcode formats are detected:

**1D Barcodes:** CODE 128, CODE 39, CODE 93, EAN-13, EAN-8, UPC-A, UPC-E, ITF, Codabar, GS1 DataBar (RSS-14), GS1 DataBar Expanded

**2D Barcodes:** PDF417, QR Code, Data Matrix, Aztec, MaxiCode

**AAMVA Driver's Licenses:** PDF417 barcodes from North American driver's licenses and ID cards are automatically detected and parsed. Barcode results include `isAamva` and `parsedData` fields with the decoded license data. See the [Barcode Reading Guide](docs/docs/guides/barcode-reading.md) for details.

## Repository Structure

```
AmbirScanWebConnect/
├── README.md                           # This file
├── CLAUDE.md                           # AI assistant context for integration code generation
├── FRAMEWORK-INTEGRATION.md            # Framework-specific integration guides
├── LICENSE                             # MIT License (SDK and sample code)
├── EULA.md                             # Proprietary EULA (installer and binaries)
├── THIRD-PARTY-NOTICES.md              # Open source license notices
├── sdk/
│   └── js/
│       └── aswcn-scanner-bridge.js     # JavaScript SDK
├── sample-app/
│   ├── scanner-demo.html               # Full scanning demo
│   └── scanner-diagnostic.html         # Diagnostic tool
└── docs/
    └── rest-api.md                     # REST API reference
```

## Licensing

### Free with Ambir Scanners

AmbirScan Web Connect is **free to use** with Ambir Technology scanners. No license key or additional purchase is required.

### Third-Party Scanner Support

Third-party TWAIN scanners may be used with AmbirScan Web Connect, but require a licensing fee. Without a license, scans performed with third-party scanners will include a watermark. [Contact Ambir for pricing](https://ambir.com/developers/).

### OCR and Barcode Decoding

OCR text extraction and barcode decoding are premium features that require additional licensing. [Contact Ambir for pricing](https://ambir.com/developers/).

### Code License

- **SDK and Sample Code** (`sdk/` and `sample-app/`): [MIT License](LICENSE) — free to use, modify, and integrate into your applications
- **Windows Installer and Binaries**: [SDK License and Subscription Agreement](EULA.md) — see EULA.md for terms. [Download installer](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScanWebConnect_4.0.0.14.exe)
- **Third-Party Components:** See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for open source license notices

### Open Source Components

The proprietary Runtime incorporates the following third-party open source software. Full license texts are provided in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

| Component | Purpose | License |
|---|---|---|
| [DTWAIN (Dynarithmic TWAIN Library)](https://github.com/dynarithmic/twain_library) | TWAIN scanner communication and image acquisition | Apache License 2.0 |
| [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) | Optical character recognition on scanned images | Apache License 2.0 |
| [ZXing.Net](https://github.com/micjahn/ZXing.Net) | Barcode detection and decoding in scanned images | Apache License 2.0 |

## Support

- **Issues:** [GitHub Issues](../../issues)
- **Documentation:** [docs/](docs/)
- **Developers:** [https://ambir.com/developers/](https://ambir.com/developers/)
- **Website:** [https://ambir.com](https://ambir.com)
- **Email:** support@ambir.com
