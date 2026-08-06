---
sidebar_position: 1
description: Deploy AmbirScan Web Connect to end-user machines, including silent installation, starting the Desktop App, and verifying service health.
keywords: [silent install scanner, enterprise deployment, MSI deployment, scanner service health check]
---

# Deployment Guide

How to deploy AmbirScan Web Connect to your end users' machines.

## Installer Distribution

[Download the installer](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScanWebConnect_4.0.0.14.exe) and distribute it to your end users. The installer handles all setup automatically.

### What the Installer Does

1. Installs the AmbirScan Web Connect Windows Service
2. Installs the AmbirScan Web Connect Desktop Application
3. Generates and installs a self-signed HTTPS certificate in the Windows certificate store
4. Configures Windows Firewall rules for `localhost:53052`
5. Registers the Windows Service for automatic startup

### Interactive Installation

Run the installer and follow the setup wizard. Administrator privileges are required.

### Silent Installation

For enterprise or automated deployment:

```cmd
AmbirScanWebConnect.msi /quiet /norestart
```

### Uninstallation

Use **Windows Add/Remove Programs** (Settings > Apps > Installed apps) to uninstall. The uninstaller removes the service, desktop app, certificate, and firewall rules.

## Starting the Desktop App

The installer registers the Desktop App to start automatically at sign-in, but it does **not** launch it as part of the install. On a freshly installed machine the Desktop App is not running until the user either signs in again or starts it manually from the Start Menu shortcut:

```
C:\ProgramData\Microsoft\Windows\Start Menu\Programs\AmbirScan Web Connect
```

The shortcut is installed for all users, so **AmbirScan Web Connect** is also findable by name in the Start Menu.

:::caution
The Windows Service starts immediately after install, so `https://localhost:53052/health` responds right away — but it reports **Degraded** and scanner endpoints return HTTP 503 until the Desktop App is running. If you are scripting a deployment, launch the Desktop App (or prompt the user to sign out and back in) before running any post-install scan test.
:::

## Post-Installation Verification

After installation and starting the Desktop App, verify the setup:

1. **System tray** — The AmbirScan Web Connect Desktop App icon should be visible
2. **Health check** — Navigate to `https://localhost:53052/health` in a browser
3. **Scanner detection** — Navigate to `https://localhost:53052/api/twain/scanners` to see connected scanners

## Network Architecture

AmbirScan Web Connect runs entirely on the local machine:

```
┌─────────────────────────────────────────────────────────┐
│                    Client Machine                        │
│                                                          │
│  ┌──────────┐   HTTPS    ┌───────────┐  Pipe  ┌──────┐ │
│  │ Browser  │◄──────────►│  Service   │◄──────►│ App  │ │
│  │          │ :53052     │ (Kestrel)  │        │(Tray)│ │
│  └──────────┘            └───────────┘        └──┬───┘ │
│                                                   │      │
│                                              TWAIN│      │
│                                                   ▼      │
│                                             ┌─────────┐  │
│                                             │ Scanner │  │
│                                             └─────────┘  │
└─────────────────────────────────────────────────────────┘
```

- The service binds to `127.0.0.1` only — it is **not** accessible from the network
- Communication between your web app and the service stays on localhost
- No data leaves the client machine

## HTTPS Certificate

The service uses a self-signed certificate (`CN=ASWCN Scanner Bridge`) stored in the Windows Local Machine certificate store.

- The installer automatically trusts this certificate
- In most cases, browsers will accept it without warnings
- If users see a certificate warning, they can navigate to `https://localhost:53052/health` and accept it manually

## System Requirements

| Requirement | Details |
|-------------|---------|
| OS | Windows 10 or later (64-bit) |
| .NET Runtime | .NET 8 (included in installer) |
| Disk Space | ~50 MB |
| RAM | Minimal (service uses ~30 MB) |
| Scanner | Any TWAIN-compatible scanner with drivers installed |
| Browser | Chrome 90+, Edge 90+ (Firefox 90+ with [additional certificate setup](./browser-security#firefox)) |

## Integrating the SDK

In your web application, include the JavaScript SDK:

```html
<script src="path/to/aswcn-scanner-bridge.js"></script>
```

The SDK automatically connects to `https://localhost:53052`. No server-side configuration is needed on your web application — all communication happens client-side in the browser.

:::tip
The SDK file is a standalone JavaScript file with no dependencies. You can host it alongside your web application assets, serve it from a CDN, or bundle it with your build tools.
:::
