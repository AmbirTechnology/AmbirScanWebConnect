---
sidebar_position: 7
---

# MSI Installer

The AmbirScan Web Connect installer is an MSI-based package that deploys all components needed for browser-based scanning: the Desktop App, Windows Service, Certificate Manager, and TWAIN runtime files. This guide covers what the installer does, how to use it for standard and silent deployments, and how to troubleshoot installation issues.

## What Gets Installed

The installer deploys the following components to `C:\Program Files (x86)\ASWCNextgen\`:

```
C:\Program Files (x86)\ASWCNextgen\
├── AmbirWebScan.exe                  Desktop App (TWAIN scanner interface)
├── appsettings.json                  Desktop App configuration
├── dtwain32u.dll                     TWAIN runtime library
├── dtwain32.ini                      TWAIN configuration
├── twaininfo.txt                     TWAIN capability definitions
├── FirewallRule.vbs                  Firewall setup script
├── UninstallFirewallRule.vbs         Firewall removal script
├── InstallService.vbs                Service registration script
├── UnInstallService.vbs              Service removal script
├── CreateCertificate\
│   └── ASWCNCertManager.exe          Certificate Manager utility
├── ASWCNService\
│   ├── ASWCNService.exe              Windows Service
│   └── appsettings.json              Service configuration
├── tessdata\                          Tesseract OCR data (optional)
├── x86\                               x86 runtime components
└── x64\                               x64 runtime components
```

### Components Summary

| Component | Executable | Purpose |
|-----------|-----------|---------|
| **Desktop App** | `AmbirWebScan.exe` | WinForms app that interfaces with TWAIN scanners via named pipe |
| **Windows Service** | `ASWCNService\ASWCNService.exe` | Kestrel HTTPS REST API on localhost:53052 |
| **Certificate Manager** | `CreateCertificate\ASWCNCertManager.exe` | Creates HTTPS certificate and configures firewall |
| **TWAIN Runtime** | `dtwain32u.dll` | Dynarithmic TWAIN library for scanner communication |

---

## Standard Installation

1. Run `AmbirScanWebConnect.exe` as **Administrator** (right-click > Run as Administrator)
2. Follow the installation wizard
3. The installer performs the following automatically:
   - Copies all application files
   - Creates firewall rules for the Desktop App
   - Registers the Windows Service (`AmbirScanWebConnect`) with Automatic startup

### Post-Installation Steps

After the installer completes, the certificate must be set up before the service can start:

```batch
cd "C:\Program Files (x86)\ASWCNextgen\CreateCertificate"
ASWCNCertManager.exe install
```

Then start the service and Desktop App:

```batch
net start AmbirScanWebConnect
"C:\Program Files (x86)\ASWCNextgen\AmbirWebScan.exe"
```

:::tip
If using the full installer package (not a manual deployment), the certificate setup and service start may be handled automatically by the installer. Check with your deployment configuration.
:::

---

## Silent Installation

For automated deployments, the installer supports silent mode:

```batch
AmbirScanWebConnect.exe SILENT=1
```

In silent mode:
- No UI is displayed
- The MSI runs with the `/qn` flag (quiet, no UI)
- Installation proceeds with default settings
- Firewall rules and service registration are performed automatically

### Silent Installation with Logging

```batch
AmbirScanWebConnect.exe SILENT=1
```

The installer writes logs to: `%TEMP%\AmbirScanWebConnect_*.log`

### Silent Uninstall

```batch
msiexec /x {58CCE509-0ECB-4E65-B52F-3DF5E070CC44} /qn /l*v uninstall.log
```

---

## What the Installer Configures

### Windows Service

The installer registers a Windows Service with the following properties:

| Property | Value |
|----------|-------|
| **Service Name** | `AmbirScanWebConnect` |
| **Display Name** | AmbirScan Web Connect |
| **Startup Type** | Automatic |
| **Executable** | `C:\Program Files (x86)\ASWCNextgen\ASWCNService\ASWCNService.exe` |

The service is registered using:
```batch
sc create AmbirScanWebConnect binpath= "...\ASWCNService\ASWCNService.exe" start= auto
```

### Firewall Rules

The installer creates firewall rules grouped under "AmbirScan Web Connect Networking":

| Rule | Direction | Protocol | Action |
|------|-----------|----------|--------|
| AmbirScan Web Connect | Inbound | TCP | Allow |
| AmbirScan Web Connect | Outbound | TCP | Allow |
| AmbirScan Web Connect | Inbound | UDP | Allow |
| AmbirScan Web Connect | Outbound | UDP | Allow |

These rules allow the Desktop App (`AmbirWebScan.exe`) to communicate freely on Private and Domain network profiles.

### Registry Entries

The installer creates standard MSI uninstall registry entries:

```
HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\{58CCE509-0ECB-4E65-B52F-3DF5E070CC44}
  DisplayName: AmbirScan Web Connect
  DisplayVersion: 4.0.0.1
  Publisher: Ambir Technology, Inc.
  InstallLocation: C:\Program Files (x86)\ASWCNextgen\
```

---

## Upgrading

The installer supports in-place upgrades from version 3.0.0 and later:

- Previous versions are detected automatically
- Files are updated in place
- Service registration is preserved
- User configuration files (`appsettings.json`) may be overwritten — back them up if you've made custom changes

To upgrade, simply run the new installer. It will detect and replace the previous version.

---

## Uninstallation

### From Control Panel

1. Open **Control Panel > Programs and Features** (or **Settings > Apps**)
2. Find "AmbirScan Web Connect"
3. Click **Uninstall**

### From Command Line

```batch
msiexec /x {58CCE509-0ECB-4E65-B52F-3DF5E070CC44}
```

### What Uninstall Does

The uninstaller performs the following:

1. **Removes the Windows Service** — Runs `sc delete AmbirScanWebConnect`
2. **Removes firewall rules** — Deletes all rules in the "AmbirScan Web Connect Networking" group
3. **Removes installed files** — Deletes the `C:\Program Files (x86)\ASWCNextgen\` directory

### What Uninstall Does NOT Remove

- **HTTPS certificate** — The self-signed certificate remains in the Windows certificate store
- **Log files** — Application logs in `%LOCALAPPDATA%\ASWCN\` are preserved
- **URL reservations** — HTTP.SYS URL reservations are not removed

To fully clean up after uninstalling, run:

```batch
REM Remove certificate and URL reservation
cd "C:\Program Files (x86)\ASWCNextgen\CreateCertificate"
ASWCNCertManager.exe uninstall

REM Or if the files are already removed, manually clean up:
REM Remove certificate
certutil -delstore My "ASWCN Scanner Bridge"
certutil -delstore Root "ASWCN Scanner Bridge"

REM Remove URL reservation
netsh http delete urlacl url=https://localhost:53052/

REM Remove firewall rules (if not already removed)
netsh advfirewall firewall delete rule name="AmbirScan Web Connect"
netsh advfirewall firewall delete rule name="ASWCN Scanner Bridge HTTPS"

REM Remove log files
rmdir /s /q "%LOCALAPPDATA%\ASWCN"
```

---

## Deployment Checklist

Use this checklist when deploying to a new client machine:

- [ ] **System requirements met** — Windows 10 or later, .NET 8 Runtime, administrator access
- [ ] **Scanner connected** — TWAIN-compatible scanner plugged in and powered on
- [ ] **TWAIN driver installed** — Scanner manufacturer's TWAIN driver is installed
- [ ] **Run installer** — `AmbirScanWebConnect.exe` as Administrator
- [ ] **Install certificate** — `ASWCNCertManager.exe install` (from elevated prompt)
- [ ] **Verify certificate** — `ASWCNCertManager.exe status` (all items show checkmarks)
- [ ] **Start service** — `net start AmbirScanWebConnect` (or verify it's running in `services.msc`)
- [ ] **Start Desktop App** — Launch `AmbirWebScan.exe`
- [ ] **Verify connectivity** — Open `https://localhost:53052/health` in browser
- [ ] **Test scanner** — Use the Desktop App's Test Scan or the [diagnostic page](https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/sample-app/scanner-diagnostic.html) to confirm scanning works
- [ ] **Test from web app** — Verify the end-to-end flow from the web application

---

## Troubleshooting Installation Issues

### Installer Requires Administrator

**Symptom:** Installer displays "Access Denied" or fails to launch.

**Solution:** Right-click the installer and select **Run as Administrator**. The installer requires elevated privileges to register the Windows Service and create firewall rules.

### Service Fails to Register

**Symptom:** After installation, the service doesn't appear in `services.msc`.

**Solutions:**
1. Verify the installation completed without errors
2. Manually run the service registration script:
   ```batch
   cscript "C:\Program Files (x86)\ASWCNextgen\InstallService.vbs"
   ```
3. Or register manually:
   ```batch
   sc create AmbirScanWebConnect binpath= "C:\Program Files (x86)\ASWCNextgen\ASWCNService\ASWCNService.exe" start= auto
   ```

### Firewall Rules Not Created

**Symptom:** The Desktop App or Service can't communicate.

**Solutions:**
1. Manually run the firewall script:
   ```batch
   cscript "C:\Program Files (x86)\ASWCNextgen\FirewallRule.vbs"
   ```
2. Check if a third-party firewall (Norton, McAfee, Bitdefender) is overriding Windows Firewall rules
3. Verify rules in Windows Firewall:
   ```batch
   netsh advfirewall firewall show rule name="AmbirScan Web Connect"
   ```

### Service Won't Start After Installation

**Symptom:** `net start AmbirScanWebConnect` fails.

**Solutions:**
1. **Certificate not installed** — Run `ASWCNCertManager.exe install` first
2. **Port conflict** — Check if port 53052 is in use:
   ```batch
   netstat -ano | findstr :53052
   ```
3. **.NET Runtime missing** — Verify .NET 8 is installed:
   ```batch
   dotnet --list-runtimes
   ```
4. Check the Windows Event Viewer (`eventvwr.msc`) under **Windows Logs > Application** for error details

### TWAIN Scanner Not Detected

**Symptom:** Desktop App shows no scanners.

**Solutions:**
1. Verify `dtwain32u.dll` exists in the installation directory
2. Confirm the scanner's TWAIN driver is installed (check the manufacturer's software)
3. The Desktop App must run as **x86** (32-bit) because TWAIN drivers are 32-bit
4. Disconnect and reconnect the scanner, then click **Refresh** in the Desktop App

### Upgrade Fails or Previous Version Remains

**Symptom:** Old version is still present after running the new installer.

**Solutions:**
1. Uninstall the old version manually first:
   ```batch
   msiexec /x {58CCE509-0ECB-4E65-B52F-3DF5E070CC44}
   ```
2. Then run the new installer
3. If the uninstall also fails, use the [Microsoft Program Install and Uninstall troubleshooter](https://support.microsoft.com/en-us/topic/fix-problems-that-block-programs-from-being-installed-or-removed-cca7d1b6-65a9-3d98-426b-e9f927e1eb4d)

---

## Installation Log

The installer writes a log file during installation. If an installation fails, this log contains detailed information about what went wrong.

**Log location:** `%TEMP%\AmbirScanWebConnect_*.log`

To find the log:
```batch
dir %TEMP%\AmbirScanWebConnect*.log
```

Key sections to review in the log:
- **Custom Action output** — Look for `FirewallRule.vbs` and `InstallService.vbs` execution results
- **File copy operations** — Verify all files were copied successfully
- **Error codes** — MSI error codes indicate the type of failure

---

## Configuration Files

After installation, the following configuration files can be customized:

### Service Configuration

**Location:** `C:\Program Files (x86)\ASWCNextgen\ASWCNService\appsettings.json`

Key settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `PipeName` | `ASWCNScannerBridgePipe` | Named pipe name (must match Desktop App) |
| `Port` | `53052` | HTTPS listening port |
| `BindLocalhostOnly` | `true` | Only accept localhost connections |
| `ConnectionTimeoutMs` | `5000` | Pipe connection timeout |
| `RequestTimeoutMs` | `300000` | Scan request timeout (5 minutes) |

### Desktop App Configuration

**Location:** `C:\Program Files (x86)\ASWCNextgen\appsettings.json`

Key settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `StartMinimized` | `false` | Start hidden in system tray |
| `StartWithWindows` | `false` | Auto-start on Windows login |
| `ShowScanPreview` | `true` | Show preview after scanning |
| `OCREnabled` | `false` | Enable Tesseract OCR |
| `DefaultResolution` | `300` | Default scan DPI |
| `DefaultColorMode` | `Color` | Default color mode |
| `EnableThirdPartyScanners` | `false` | Support non-Ambir scanners |

:::caution
Configuration files may be overwritten during upgrades. Back up any custom settings before upgrading.
:::

---

## System Requirements

| Requirement | Minimum |
|-------------|---------|
| **Operating System** | Windows 10 or later (x86 or x64) |
| **Runtime** | .NET 8 Runtime |
| **Privileges** | Administrator (for installation) |
| **Disk Space** | 100 MB |
| **RAM** | 512 MB |
| **Scanner** | TWAIN-compatible scanner with manufacturer driver |
| **Browser** | Chrome or Edge (Firefox supported with [additional certificate setup](./browser-security#firefox)) |
