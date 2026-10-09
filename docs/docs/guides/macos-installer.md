---
sidebar_position: 8
description: Install AmbirScan Web Connect on macOS — system requirements, what the signed installer package sets up, multi-user Macs, upgrading and uninstalling.
keywords: [macOS scanner installer, Mac browser scanning, pkg installer, Apple Silicon scanner, LaunchAgent scanner service]
---

# macOS Installer

The macOS installer is a signed, notarized `.pkg` that sets up the AmbirScan Web Connect
scanning service on a Mac. Your web application does not change: the service answers the
same [REST API](../rest-api.md) on `https://localhost:53052`, and the same
[JavaScript SDK](../sdk-reference.md) works against it unmodified.

On macOS the scanner interface and the HTTPS service run as a **single background
process** — there is no separate desktop app to start and no Windows-style service.

## System Requirements

| Requirement | Details |
|-------------|---------|
| **macOS** | macOS 13 Ventura or later |
| **Processor** | Apple Silicon or Intel. One package covers both; the installer picks the right build. |
| **Scanner driver** | The macOS ICA driver for your scanner must be installed. For Ambir scanners, install the [Ambir ICA Driver 1.2.52](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirIcaDriver.1.2.52.pkg) first. |
| **Browser** | Safari, Chrome or Edge. Firefox needs [one extra setting](./browser-security.md#firefox). |
| **Account** | An administrator account — macOS asks for an administrator password to install the package and to trust the HTTPS certificate |

## Download

- [Download the macOS installer](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirScannerBridge-4.1.0.0.pkg) (`AmbirScannerBridge-4.1.0.0.pkg`)
- For Ambir scanners, also [download the Ambir ICA Driver 1.2.52](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirIcaDriver.1.2.52.pkg) (`AmbirIcaDriver.1.2.52.pkg`)

## Installation

1. If you use an Ambir scanner, install the Ambir ICA Driver first: open
   `AmbirIcaDriver.1.2.52.pkg` and follow the installer.
2. Open `AmbirScannerBridge-4.1.0.0.pkg`. The installer window is titled **Ambir Scanner Bridge**.
3. Read and accept the license agreement.
4. When asked, enter an administrator password. macOS asks for it to install the package and
   to trust the HTTPS certificate the installer creates for this Mac.
5. When the installer finishes, the service is already running and starts automatically
   every time you log in.

### Verify the Installation

Open this address in your browser:

```
https://localhost:53052/health
```

You should see `Healthy`. You can also check from Terminal:

```bash
curl -sk https://localhost:53052/api/twain/status
```

## What the Installer Sets Up

| Item | Location |
|------|----------|
| Service files | `/Library/Application Support/Ambir/ScannerBridge/` |
| Background service (LaunchAgent) | `~/Library/LaunchAgents/com.ambir.aswcn.scannerbridge.plist` |
| HTTPS certificate `ASWCN Scanner Bridge` | Private key in your login keychain; trust setting in the System keychain |
| Logs | `~/Library/Logs/ASWCN/ScannerBridge/` |

The certificate is generated on the Mac during setup, is unique to each user account that sets it up, and is
used only for connections from the browser to `localhost`.

## Multiple Users and Managed Installs

The service runs **per user**, because the certificate's private key lives in the user's
own login keychain. The installer configures it for the user who is logged in while it runs.

Every other user of the same Mac — and every user when the package is installed with nobody
logged in, for example over SSH or by a device-management tool — needs this one-time setup,
run while logged in as that user. Use `arm64` on Apple Silicon and `x64` on Intel. The second
command uses `sudo`, so it needs an administrator password; a standard user needs an
administrator to enter it.

```bash
"/Library/Application Support/Ambir/ScannerBridge/arm64/ASWCNScannerBridgeDaemon" --install-cert
sudo "/Library/Application Support/Ambir/ScannerBridge/arm64/ASWCNScannerBridgeDaemon" --trust-cert
"/Library/Application Support/Ambir/ScannerBridge/install-agent.sh"
```

:::caution
Run the first and third commands **without** `sudo`. Running `--install-cert` with `sudo`
puts the certificate's private key in the administrator's keychain, where the service can
never read it.
:::

## Licensing and Settings

There is no desktop app on macOS. Licensing and settings are managed from an admin page
served by the service itself. Open it in a browser **on the Mac where the service is
installed**:

```
https://localhost:53052/admin
```

From the admin page you can:

- see the service status and which licensed features are active
- activate or deactivate a license key
- set preferred scanner defaults (resolution, color mode, page size, image format). These are
  suggestions a scanning page can read to pre-select its controls; they do not change what a
  scan request asks for.
- change the logging level, how long logs are kept, and the log folder

For security, the admin page's license and settings actions only accept requests from the
admin page itself; other websites cannot change them.

## Upgrading

Run the new `.pkg`. It stops the running service, replaces the files and starts the new
version. The existing certificate is kept.

## Uninstalling

There is no separate uninstaller. If a license is active, deactivate it first on the
[admin page](#licensing-and-settings) so the activation can be used on another computer.
Then run these commands in Terminal as the user who installed it:

```bash
# 1. Stop and remove the background service (run as yourself, not sudo)
"/Library/Application Support/Ambir/ScannerBridge/uninstall-agent.sh"

# 2. Remove the HTTPS certificate and its private key
security delete-identity -c "ASWCN Scanner Bridge"
sudo security delete-certificate -c "ASWCN Scanner Bridge" /Library/Keychains/System.keychain

# 3. Remove the service files and the installer receipt
sudo rm -rf "/Library/Application Support/Ambir/ScannerBridge"
sudo pkgutil --forget com.ambir.aswcn.scannerbridge
```

On a Mac with several users, each user runs steps 1 and 2 for their own account.

## Next Steps

- [Getting Started](../getting-started.md) — your first scan from the browser
- [macOS Diagnostics](./macos-diagnostics.md) — logs, restarting the service and common problems
- [SDK Reference — Platform Differences](../sdk-reference.md#platform-differences) — scan
  options that behave differently on macOS
