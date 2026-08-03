---
sidebar_position: 2
---

# Getting Started

Get up and running with AmbirScan Web Connect in minutes.

## Try It Now

Want to start scanning immediately without writing any code? A hosted demo application is available at:

**[https://ambirscanwebconnect.azurewebsites.net](https://ambirscanwebconnect.azurewebsites.net)**

Simply install AmbirScan Web Connect (Step 1 below), then open the link above in your browser. Select your scanner and start scanning — no web app setup required. This is the fastest way to verify your installation and explore the scanning features.

## Prerequisites

- **OS:** Windows 10 or later (64-bit)
- **Browser:** Chrome 90+, Edge 90+, or any modern Chromium-based browser (Firefox 90+ is supported with [additional certificate setup](./guides/browser-security#firefox))
- **Scanner:** Any TWAIN-compatible scanner
- **.NET Runtime:** .NET 8 Runtime (included in the installer)

## Step 1: Install AmbirScan Web Connect

[Download the installer](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScanWebConnect_4.0.0.14.exe) and run it on each client machine that has a scanner connected.

The installer will set up:
- **AmbirScan Web Connect Service** — HTTPS REST API on `localhost:53052`
- **AmbirScan Web Connect Desktop App** — TWAIN scanner interface (runs in the system tray)
- **Self-signed HTTPS certificate** — Automatically installed and trusted
- **Windows Firewall rules** — For localhost communication

:::note
The installer requires Administrator privileges for certificate and service installation.
:::

## Step 2: Verify the Installation

Open a browser and navigate to:

```
https://localhost:53052/health
```

You should see a JSON response indicating the service is healthy. The Desktop App icon should appear in the Windows system tray.

## Step 3: Add the JavaScript SDK

Copy [`aswcn-scanner-bridge.js`](https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/sdk/js/aswcn-scanner-bridge.js) into your web application:

```html
<script src="path/to/aswcn-scanner-bridge.js"></script>
```

## Step 4: Scan Your First Document

```javascript
// Initialize the scanner bridge
const scanner = new ASWCNScannerBridge();

// Check if the service is running
const isAvailable = await scanner.checkServiceStatus();
if (!isAvailable) {
    alert('Please ensure AmbirScan Web Connect is running.');
    return;
}

// Get available scanners
const sources = await scanner.getSources();
console.log('Available scanners:', sources);

// Open a scanner
await scanner.openSource(sources[0].name);

// Scan a document
const images = await scanner.scan({
    resolution: 300,
    colorMode: 'Color',
    duplexMode: 'Simplex',
    pageSize: 'Letter'
});

// Display the scanned image
images.forEach(image => {
    const img = document.createElement('img');
    img.src = `data:${image.mimeType};base64,${image.base64Data}`;
    document.body.appendChild(img);
});

// Close the scanner when done
await scanner.closeSource();
```

## Step 5: Explore the Sample App

The repository includes a complete working demo in the [`sample-app/`](https://github.com/AmbirTechnology/AmbirScanWebConnect/tree/main/sample-app) directory:

- **`scanner-demo.html`** — Full-featured scanning demo with scanner selection, capabilities, scan parameters, image display, and barcode results
- **`scanner-diagnostic.html`** — Diagnostic tool for testing individual API calls

## Next Steps

- [Deployment Guide](guides/deployment) — Deploy to your end users
- [SDK Reference](sdk-reference) — Complete API documentation
- [REST API Reference](rest-api) — Direct REST API usage
- [Barcode Reading](guides/barcode-reading) — Detect barcodes in scanned images
