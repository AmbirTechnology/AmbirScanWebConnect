---
sidebar_position: 1
description: Deploy AmbirScan Web Connect to Windows and macOS end-user machines, including silent and managed installation and verifying service health.
keywords: [silent install scanner, enterprise deployment, MSI deployment, scanner service health check]
---

# Deployment Guide

How to deploy AmbirScan Web Connect to your end users' machines.

## Installer Distribution

There is one installer per platform. Your web application is the same for both — the
JavaScript SDK and REST API do not change.

| Platform | Installer |
|----------|-----------|
| Windows | [AmbirScanWebConnect_4.1.0.0.exe](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScanWebConnect_4.1.0.0.exe) |
| macOS | [AmbirScannerBridge-4.1.0.0.pkg](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScannerBridge-4.1.0.0.pkg) |

Distribute the installer to your end users. Each handles all setup automatically. The rest
of this section covers Windows; for macOS see the [macOS Installer guide](./macos-installer.md).

### What the Windows Installer Does

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

### macOS Deployment

Run the package from the command line or a device-management tool:

```bash
sudo installer -pkg AmbirScannerBridge-4.1.0.0.pkg -target /
```

The service runs per user. The installer configures it for whoever is logged in at the
Mac's screen. Every other user of that Mac — and every user, if nobody was logged in during
installation — completes a short one-time setup — see
[Multiple Users and Managed Installs](./macos-installer.md#multiple-users-and-managed-installs).
On macOS there is no desktop app to start, so the next section applies to Windows only.

## Starting the Desktop App (Windows)

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

The diagram shows Windows. On macOS the scanner interface and the HTTPS service are a
single background process, so there is no desktop app and no pipe between them; the browser
still talks to `https://localhost:53052`.

## HTTPS Certificate

The service uses a self-signed certificate (`CN=ASWCN Scanner Bridge`) generated on each
machine during installation.

- **Windows:** stored in the Local Machine certificate store and trusted by the installer
- **macOS:** the private key is stored in the user's login keychain and the trust setting
  in the System keychain; trusting it requires an administrator password
- In most cases, browsers will accept it without warnings
- If users see a certificate warning, they can navigate to `https://localhost:53052/health` and accept it manually

## System Requirements

| Requirement | Windows | macOS |
|-------------|---------|-------|
| OS | Windows 10 or Windows 11, x64 or Arm64 | macOS 13 Ventura or later, Apple Silicon or Intel |
| Runtime | .NET 10 runtime, included in the installer | Included in the installer |
| Disk Space | ~400 MB | ~210 MB |
| Scanner | Any TWAIN-compatible scanner with drivers installed | Scanner with its macOS ICA driver installed ([Ambir ICA Driver](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirIcaDriver.1.2.52.pkg) for Ambir scanners) |
| Browser | Chrome, Edge (Firefox with [additional certificate setup](./browser-security#firefox)) | Safari, Chrome, Edge (Firefox with [additional certificate setup](./browser-security#firefox)) |

## Integrating the SDK

In your web application, include the JavaScript SDK:

```html
<script src="path/to/aswcn-scanner-bridge.js"></script>
```

The SDK automatically connects to `https://localhost:53052`. No server-side configuration is needed on your web application — all communication happens client-side in the browser.

:::tip
The SDK file is a standalone JavaScript file with no dependencies. You can host it alongside your web application assets, serve it from a CDN, or bundle it with your build tools.
:::
