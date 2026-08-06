---
sidebar_position: 6
description: Use ASWCNCertManager.exe to install the localhost HTTPS certificate, configure Windows Firewall, and set up URL reservations.
keywords: [ASWCNCertManager, self-signed certificate, localhost HTTPS, URL reservation, Windows Firewall scanner]
---

# Certificate Manager

The AmbirScan Web Connect Certificate Manager (`ASWCNCertManager.exe`) is a command-line utility that sets up the security infrastructure required by the Windows Service. It creates and installs a self-signed HTTPS certificate, configures Windows Firewall, and sets up URL reservations.

This utility must be run once before starting the service for the first time, and again if the certificate expires or needs to be renewed.

## Commands

The Certificate Manager provides three subcommands:

| Command | Description | Admin Required |
|---------|-------------|:--------------:|
| `install` | Create certificate, configure firewall and URL reservation | Yes |
| `uninstall` | Remove certificate, firewall rule, and URL reservation | Yes |
| `status` | Check current configuration status | No |

All commands accept an optional `--port` (or `-p`) flag to specify a custom port. The default is `53052`.

```batch
ASWCNCertManager.exe install
ASWCNCertManager.exe install --port 8443
ASWCNCertManager.exe status
ASWCNCertManager.exe uninstall
```

:::caution Administrator Required
The `install` and `uninstall` commands must be run from an elevated Command Prompt or PowerShell (Run as Administrator). The utility will display an error and exit if it does not have administrator privileges.
:::

---

## Install Command

```batch
ASWCNCertManager.exe install [--port 53052]
```

The install command performs three steps in sequence:

### Step 1: Create and Install the Self-Signed Certificate

A self-signed HTTPS certificate is created with the following specifications:

| Property | Value |
|----------|-------|
| **Subject** | `CN=ASWCN Scanner Bridge` |
| **Key Algorithm** | RSA 2048-bit |
| **Hash Algorithm** | SHA256 |
| **Validity** | 5 years from installation date |
| **Key Usage** | Digital Signature, Key Encipherment |
| **Extended Key Usage** | Server Authentication |
| **Subject Alternative Names** | `localhost`, `127.0.0.1`, `::1` |

The certificate is installed in two Windows certificate stores:

1. **Personal Store** (`LocalMachine\My`) — Contains the certificate with its private key. This is where the service loads the certificate for HTTPS.
2. **Trusted Root Certification Authorities** (`LocalMachine\Root`) — Contains the certificate without the private key. This makes the self-signed certificate trusted by the system, preventing browser security warnings.

### Step 2: Configure Windows Firewall

An inbound firewall rule is created to allow HTTPS traffic on the configured port:

| Property | Value |
|----------|-------|
| **Rule Name** | `ASWCN Scanner Bridge HTTPS` |
| **Direction** | Inbound |
| **Action** | Allow |
| **Protocol** | TCP |
| **Port** | 53052 (or custom) |
| **Profiles** | Private and Domain only (not Public) |

### Step 3: Configure URL Reservation

An HTTP.SYS URL reservation is registered so the service can listen on the HTTPS port:

```
URL: https://localhost:53052/
User: Everyone
```

This allows the service to bind to the port without requiring the service itself to run as Administrator.

### Expected Output

```
=== ASWCN Scanner Bridge Certificate Manager ===
Installing certificate and configuring firewall for port 53052...

1. Creating and installing self-signed certificate...
   Installing to Personal store...
   Installing to Trusted Root Certification Authorities...
   Certificate thumbprint: A1B2C3D4E5F6...
   ✓ Certificate installed successfully

2. Configuring Windows Firewall for port 53052...
   ✓ Firewall rules configured successfully

3. Configuring HTTP.SYS URL reservation for port 53052...
   ✓ URL reservation configured successfully

=== Installation completed successfully! ===

The ASWCN Scanner Bridge Service can now be started on port 53052.
```

---

## Status Command

```batch
ASWCNCertManager.exe status [--port 53052]
```

The status command checks all four configuration items and reports their state. This command does **not** require administrator privileges, making it safe to run at any time.

### What It Checks

**1. Personal Store Certificate**
- Searches for a certificate with subject `CN=ASWCN Scanner Bridge` in the Personal store
- Displays the thumbprint, valid-from date, and valid-to date
- Warns if the certificate has expired or will expire within 30 days

**2. Trusted Root Certificate**
- Confirms the certificate is installed in the Trusted Root Certification Authorities store

**3. Firewall Rule**
- Checks whether the `ASWCN Scanner Bridge HTTPS` firewall rule exists

**4. URL Reservation**
- Checks whether the URL reservation for `https://localhost:53052/` exists
- This is optional — a missing reservation is shown as a warning, not an error

### Example Output (All Configured)

```
=== ASWCN Scanner Bridge Certificate Manager ===
Checking configuration status for port 53052...

Certificate Status (Personal Store):
   ✓ Certificate is installed in Personal store
   Subject: CN=ASWCN Scanner Bridge
   Thumbprint: A1B2C3D4E5F6...
   Valid From: 2/25/2026
   Valid To: 2/25/2031

Certificate Status (Trusted Root):
   ✓ Certificate is installed in Trusted Root Certification Authorities

Firewall Status (Port 53052):
   ✓ Firewall rule is configured

URL Reservation Status (Port 53052):
   ✓ URL reservation is configured
```

### Expiration Warnings

If the certificate is **expired**:
```
   ⚠ Certificate has expired
```

If the certificate **expires within 30 days**:
```
   ⚠ Certificate expires soon
```

In either case, run `uninstall` followed by `install` to replace the certificate.

### Example Output (Nothing Configured)

```
Certificate Status (Personal Store):
   ✗ Certificate is not installed in Personal store

Certificate Status (Trusted Root):
   ✗ Certificate is not installed in Trusted Root Certification Authorities

Firewall Status (Port 53052):
   ✗ Firewall rule is not configured

URL Reservation Status (Port 53052):
   ⚠ URL reservation is not configured (may not be required)
```

---

## Uninstall Command

```batch
ASWCNCertManager.exe uninstall [--port 53052]
```

The uninstall command reverses all three installation steps:

1. **Removes the certificate** from both the Personal and Trusted Root stores (all certificates matching `CN=ASWCN Scanner Bridge`)
2. **Deletes the firewall rule** named `ASWCN Scanner Bridge HTTPS`
3. **Removes the URL reservation** for `https://localhost:53052/`

### Expected Output

```
=== ASWCN Scanner Bridge Certificate Manager ===
Removing certificate and firewall rules for port 53052...

1. Removing self-signed certificate...
   ✓ Certificate removed successfully

2. Removing Windows Firewall rules for port 53052...
   ✓ Firewall rules removed successfully

3. Removing HTTP.SYS URL reservation for port 53052...
   ✓ URL reservation removed successfully

=== Uninstallation completed successfully! ===
```

---

## Common Workflows

### First-Time Setup

Run once on a new machine after installing the software:

```batch
REM Open an elevated Command Prompt, then:
ASWCNCertManager.exe install
ASWCNCertManager.exe status
```

Verify all four items show checkmarks, then start the service.

### Renewing an Expired Certificate

```batch
REM Open an elevated Command Prompt, then:
ASWCNCertManager.exe uninstall
ASWCNCertManager.exe install
ASWCNCertManager.exe status

REM Restart the service to pick up the new certificate
net stop "ASWCN Scanner Bridge Service"
net start "ASWCN Scanner Bridge Service"
```

### Checking Status During Troubleshooting

This does not require admin and can be run at any time:

```batch
ASWCNCertManager.exe status
```

Look for:
- Any items marked with `✗` — these need to be fixed by running `install`
- Certificate expiration warnings (`⚠`) — renew if expired or expiring soon
- All `✓` marks — certificate infrastructure is healthy; look elsewhere for the issue

### Using a Custom Port

If you need to run the service on a different port:

```batch
REM Install with custom port
ASWCNCertManager.exe install --port 8443

REM Update appsettings.json in the service directory
REM Change "Port": 53052 to "Port": 8443

REM Restart the service
net stop "ASWCN Scanner Bridge Service"
net start "ASWCN Scanner Bridge Service"

REM Verify
ASWCNCertManager.exe status --port 8443
```

### Complete Removal

To remove all security infrastructure (e.g., before uninstalling the software):

```batch
REM Stop the service first
net stop "ASWCN Scanner Bridge Service"

REM Remove certificate and firewall rules
ASWCNCertManager.exe uninstall

REM Verify everything is removed
ASWCNCertManager.exe status
```

---

## Troubleshooting

### "This command requires administrator privileges"

Right-click Command Prompt or PowerShell and select **Run as Administrator**, then retry.

### Service Won't Start After Installation

1. Run `ASWCNCertManager.exe status` to verify all items are configured
2. If the certificate is missing from the Personal store, run `install` again
3. Check the service logs for the message "Certificate not found" — this confirms the certificate is the issue

### Browser Shows "Your connection is not private"

This means the certificate is not in the Trusted Root store:

1. Run `ASWCNCertManager.exe status` and check the Trusted Root line
2. If it shows `✗`, run `uninstall` then `install` to reinstall into both stores
3. Alternatively, navigate to `https://localhost:53052/health` in the browser, click **Advanced > Proceed to localhost**, and the browser will remember the exception

### Certificate Shows as Expired

1. Run `ASWCNCertManager.exe status` to confirm expiration
2. Run `ASWCNCertManager.exe uninstall` to remove the old certificate
3. Run `ASWCNCertManager.exe install` to create a fresh 5-year certificate
4. Restart the Windows Service to load the new certificate

### Firewall Still Blocking After Install

1. Verify the rule exists: run `ASWCNCertManager.exe status`
2. Check Windows Firewall is not disabled or overridden by a third-party firewall (e.g., Norton, McAfee, Bitdefender)
3. Manually check the rule in Windows Defender Firewall:
   - Open `wf.msc` (Windows Firewall with Advanced Security)
   - Click **Inbound Rules**
   - Look for "ASWCN Scanner Bridge HTTPS"
   - Verify it shows **Enabled: Yes** and **Action: Allow**
4. If a third-party firewall is in use, you may need to add an equivalent rule in that firewall's interface

### Port Conflict

If another application is using port 53052:

```batch
REM Check what's using the port
netstat -ano | findstr :53052
```

Options:
- Stop the conflicting application
- Use a different port: `ASWCNCertManager.exe install --port 54000` and update the service configuration

---

## Technical Reference

### Certificate Details

| Property | Value |
|----------|-------|
| Subject | `CN=ASWCN Scanner Bridge` |
| Key Size | 2048-bit RSA |
| Signature Algorithm | SHA256 with RSA (PKCS#1) |
| Validity Period | 5 years |
| Date Offset | Backdated 1 day for compatibility |
| SAN Entries | `localhost`, `127.0.0.1`, `::1` |
| Key Usage (Critical) | Digital Signature, Key Encipherment |
| Extended Key Usage (Critical) | Server Authentication (1.3.6.1.5.5.7.3.1) |
| Storage Flags | PersistKeySet, MachineKeySet |
| Personal Store | `LocalMachine\My` (with private key) |
| Trusted Root Store | `LocalMachine\Root` (without private key) |

### Firewall Rule Details

| Property | Value |
|----------|-------|
| Rule Name | `ASWCN Scanner Bridge HTTPS` |
| Direction | Inbound |
| Protocol | TCP |
| Port | 53052 (configurable) |
| Action | Allow |
| Profiles | Private, Domain |

### Manual Verification Commands

These Windows commands can be used to manually verify each component:

```batch
REM Check certificate in Personal store
certutil -store My "ASWCN Scanner Bridge"

REM Check certificate in Trusted Root store
certutil -store Root "ASWCN Scanner Bridge"

REM Check firewall rule
netsh advfirewall firewall show rule name="ASWCN Scanner Bridge HTTPS"

REM Check URL reservation
netsh http show urlacl url=https://localhost:53052/

REM Check what's listening on the port
netstat -ano | findstr :53052
```
