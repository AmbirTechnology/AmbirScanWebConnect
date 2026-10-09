---
sidebar_position: 1
slug: /
description: AmbirScan Web Connect lets web applications scan documents from local scanners on Windows and macOS through a JavaScript SDK and a local REST API — no browser plugins or extensions required.
keywords: [browser based scanning, web scanning, TWAIN, macOS scanning, document scanning, JavaScript scanner SDK, scan from browser]
---

# Introduction

AmbirScan Web Connect enables web applications to control local document scanners through a simple JavaScript SDK. It bridges the gap between browser-based applications and hardware scanners by providing a local service, on Windows or macOS, that your web app communicates with via a REST API.

**One web app, two installers.** The JavaScript SDK, the REST API and the request and response formats are the same on Windows and macOS. You write your web application once and it works against either; only the installer your users run differs.

## How It Works

```
┌──────────────────┐    HTTPS (REST API)    ┌────────────────────────┐   Internal    ┌─────────────┐
│   Your Web App   │ ◄────────────────────► │  AmbirScan Web Connect │ ◄───────────► │   Scanner   │
│   (Browser)      │   localhost:53052      │  (Windows or macOS     │               │   Hardware  │
│                  │                        │   local service)       │               │             │
└──────────────────┘                        └────────────────────────┘               └─────────────┘
```

1. Your web application includes the JavaScript SDK (`aswcn-scanner-bridge.js`)
2. The SDK communicates with the locally installed AmbirScan Web Connect service over HTTPS on `localhost:53052`
3. The service talks to the scanner — through TWAIN on Windows, Apple's Image Capture framework on macOS — and returns scanned images as Base64-encoded data

## Live Demo

A hosted demo application is available for developers to test scanning without building their own web app:

**[https://ambirscanwebconnect.azurewebsites.net](https://ambirscanwebconnect.azurewebsites.net)**

Install AmbirScan Web Connect on your machine, then open the link above to start scanning immediately.

## Components

| Component | Description |
|-----------|-------------|
| **JavaScript SDK** | Client-side library you include in your web application. The same file works with both platforms. |
| **Windows client** | A Windows Service (HTTPS REST API on `localhost:53052`) plus a Desktop App in the system tray that talks to TWAIN scanners. Installed by a Windows installer that also sets up the certificate and firewall rules. |
| **macOS client** | A single background service that serves the same REST API on `localhost:53052` and talks to scanners through Apple's Image Capture framework. Installed by a signed `.pkg` that also sets up the certificate. |

## Supported Platforms and Scanners

| | Windows | macOS |
|---|---|---|
| **Operating system** | Windows 10 or Windows 11, x64 or Arm64 | macOS 13 Ventura or later, Apple Silicon or Intel |
| **Scanners** | Any TWAIN-compatible scanner, including all Ambir models | Scanners with a macOS ICA driver, including Ambir models |

A few scan options work only on Windows; on macOS they are ignored rather than rejected, so
the same request works on both. See [Platform Differences](./sdk-reference.md#platform-differences).

## Licensing

### Free with Ambir Scanners

AmbirScan Web Connect is **free to use** with Ambir Technology scanners. No license key or additional purchase is required.

### Third-Party Scanner Support

Scanners from other manufacturers may be used with AmbirScan Web Connect, but require a third-party scanner license. Without one, they are not listed by `getSources()`. [Contact Ambir for pricing](https://ambir.com/developers/).

### OCR and Barcode Decoding

OCR text extraction and barcode decoding are premium features that require additional licensing. [Contact Ambir for pricing](https://ambir.com/developers/).

### Code License

- **SDK and Sample Code** — [MIT License](https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/LICENSE). Free to use, modify, and integrate into your applications.
- **Windows and macOS Installers and Binaries** — [Proprietary EULA](https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/EULA.md). See EULA for terms.
