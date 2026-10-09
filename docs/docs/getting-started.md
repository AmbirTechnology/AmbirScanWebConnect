---
sidebar_position: 2
description: Install AmbirScan Web Connect on Windows or macOS and run your first browser-based scan with a few lines of JavaScript.
keywords: [install scanner SDK, browser scanning quickstart, TWAIN scanner setup, scan documents from web app]
---

# Getting Started

Get up and running with AmbirScan Web Connect in minutes.

## Try It Now

Want to start scanning immediately without writing any code? A hosted demo application is available at:

**[https://ambirscanwebconnect.azurewebsites.net](https://ambirscanwebconnect.azurewebsites.net)**

Simply install AmbirScan Web Connect (Steps 1 and 2 below), then open the link above in your browser. Select your scanner and start scanning — no web app setup required. This is the fastest way to verify your installation and explore the scanning features.

## Prerequisites

AmbirScan Web Connect runs on Windows and macOS. Your web application is the same for both:
one JavaScript SDK and one REST API. Only the installer differs.

| | Windows | macOS |
|---|---|---|
| **OS** | Windows 10 or Windows 11, x64 or Arm64 | macOS 13 Ventura or later, Apple Silicon or Intel |
| **Browser** | Chrome or Edge | Safari, Chrome or Edge |
| **Scanner** | TWAIN-compatible scanner with its driver installed | Scanner with its macOS ICA driver installed ([Ambir ICA Driver](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirIcaDriver.1.2.52.pkg) for Ambir scanners) |
| **Runtime** | .NET 10 runtime, included in the installer | Included in the installer |

Firefox is supported on both with [one extra setting](./guides/browser-security#firefox).

## Step 1: Install AmbirScan Web Connect

Install AmbirScan Web Connect on each computer that has a scanner connected.

### Windows

[Download the Windows installer](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScanWebConnect_4.1.0.0.exe) and run it as Administrator. The installer sets up:

- **AmbirScan Web Connect Service** — HTTPS REST API on `localhost:53052`
- **AmbirScan Web Connect Desktop App** — TWAIN scanner interface (runs in the system tray)
- **Self-signed HTTPS certificate** — Automatically installed and trusted
- **Windows Firewall rules** — For localhost communication

### macOS

If you use an Ambir scanner, first install the [Ambir ICA Driver](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirIcaDriver.1.2.52.pkg). Then [download the macOS installer](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScannerBridge-4.1.0.0.pkg) and open it. Enter an administrator password when asked (to install the package and trust the HTTPS certificate). When the installer finishes, the service is already running on `localhost:53052` — there is no desktop app to start, so skip to [Step 3](#step-3-verify-the-installation). See the [macOS Installer guide](./guides/macos-installer) for details.

## Step 2: Start the Desktop App (Windows)

The Windows installer does not launch the Desktop App. It starts automatically at every subsequent sign-in, but after the first install you need to start it once yourself, from the Start Menu shortcut:

```
C:\ProgramData\Microsoft\Windows\Start Menu\Programs\AmbirScan Web Connect
```

Or search for **AmbirScan Web Connect** in the Start Menu. Once it starts, its icon appears in the Windows system tray.

:::note
Until the Desktop App is running, the service has nothing to talk to and scanner requests return HTTP 503.
:::

## Step 3: Verify the Installation

Open a browser and navigate to:

```
https://localhost:53052/health
```

You should see `Healthy`.

## Step 4: Add the JavaScript SDK

Copy [`aswcn-scanner-bridge.js`](https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/sdk/js/aswcn-scanner-bridge.js) into your web application:

```html
<script src="path/to/aswcn-scanner-bridge.js"></script>
```

## Step 5: Scan Your First Document

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

## Step 6: Explore the Sample App

The repository includes a complete working demo in the [`sample-app/`](https://github.com/AmbirTechnology/AmbirScanWebConnect/tree/main/sample-app) directory:

- **`scanner-demo.html`** — Full-featured scanning demo with scanner selection, capabilities, scan parameters, image display, and barcode results
- **`scanner-diagnostic.html`** — Diagnostic tool for testing individual API calls

## Next Steps

- [Deployment Guide](guides/deployment) — Deploy to your end users
- [macOS Installer](guides/macos-installer) — Install and manage the service on a Mac
- [SDK Reference](sdk-reference) — Complete API documentation
- [REST API Reference](rest-api) — Direct REST API usage
- [Barcode Reading](guides/barcode-reading) — Detect barcodes in scanned images
