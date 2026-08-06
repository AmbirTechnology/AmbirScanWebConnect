---
sidebar_position: 1
slug: /
description: AmbirScan Web Connect lets web applications scan documents from local TWAIN scanners through a JavaScript SDK and a local REST API — no browser plugins or extensions required.
keywords: [browser based scanning, web scanning, TWAIN, document scanning, JavaScript scanner SDK, scan from browser]
---

# Introduction

AmbirScan Web Connect enables web applications to control local TWAIN scanners through a simple JavaScript SDK. It bridges the gap between browser-based applications and hardware scanners by providing a local Windows service that your web app communicates with via a REST API.

## How It Works

```
┌──────────────────┐    HTTPS (REST API)    ┌────────────────────────┐    Internal    ┌─────────────┐
│   Your Web App   │ ◄──────────────────── │  AmbirScan Web Connect │ ◄───────────► │   Scanner   │
│   (Browser)      │   localhost:53052      │  (Windows Service +    │    TWAIN      │   Hardware  │
│                  │                        │   Desktop App)         │               │             │
└──────────────────┘                        └────────────────────────┘               └─────────────┘
```

1. Your web application includes the JavaScript SDK (`aswcn-scanner-bridge.js`)
2. The SDK communicates with the locally installed AmbirScan Web Connect service over HTTPS on `localhost:53052`
3. The service interfaces with TWAIN scanners and returns scanned images as Base64-encoded data

## Live Demo

A hosted demo application is available for developers to test scanning without building their own web app:

**[https://ambirscanwebconnect.azurewebsites.net](https://ambirscanwebconnect.azurewebsites.net)**

Install AmbirScan Web Connect on your machine, then open the link above to start scanning immediately.

## Components

| Component | Description |
|-----------|-------------|
| **Windows Service** | HTTPS REST API running on `localhost:53052`. Receives scan commands from your web app. |
| **Desktop Application** | Runs in the system tray. Interfaces directly with TWAIN scanner hardware. |
| **JavaScript SDK** | Client-side library you include in your web application. |
| **Installer** | Windows MSI that installs the service, desktop app, certificates, and firewall rules. |

## Supported Scanners

AmbirScan Web Connect works with any TWAIN-compatible scanner, including all Ambir scanner models.

## Licensing

### Free with Ambir Scanners

AmbirScan Web Connect is **free to use** with Ambir Technology scanners. No license key or additional purchase is required.

### Third-Party Scanner Support

Third-party TWAIN scanners may be used with AmbirScan Web Connect, but require a licensing fee. Without a license, scans performed with third-party scanners will include a watermark. [Contact Ambir for pricing](https://ambir.com/developers/).

### OCR and Barcode Decoding

OCR text extraction and barcode decoding are premium features that require additional licensing. [Contact Ambir for pricing](https://ambir.com/developers/).

### Code License

- **SDK and Sample Code** — [MIT License](https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/LICENSE). Free to use, modify, and integrate into your applications.
- **Windows Installer and Binaries** — [Proprietary EULA](https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/EULA.md). See EULA for terms.
