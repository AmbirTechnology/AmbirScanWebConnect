---
sidebar_position: 5
description: Diagnose the AmbirScan Web Connect Windows Service — health endpoint, log locations, named pipe connectivity, and localhost:53052 issues.
keywords: [Windows Service diagnostics, named pipe, health endpoint, localhost 53052, service logs]
---

# Windows Service Diagnostics

The AmbirScan Web Connect Windows Service is the middleware that bridges browser requests to the Desktop App. It runs as a standard Windows Service, listening for HTTPS requests on `localhost:53052` and forwarding commands to the Desktop App via a named pipe.

This guide covers how to diagnose issues with the service itself — connectivity, certificates, logging, and common failure modes.

## Service Management

### Checking Service Status

Open a Command Prompt (as Administrator) or use the Services console:

**Command Prompt:**
```batch
sc query "ASWCN Scanner Bridge Service"
```
Expected output includes `STATE: 4 (RUNNING)`.

**Services Console:**
1. Press Win+R, type `services.msc`, press Enter
2. Find "AmbirScan Web Connect Service"
3. Check the **Status** column — should show **Running**

### Starting and Stopping

```batch
REM Start the service
net start "ASWCN Scanner Bridge Service"

REM Stop the service
net stop "ASWCN Scanner Bridge Service"

REM Restart (stop then start)
net stop "ASWCN Scanner Bridge Service" && net start "ASWCN Scanner Bridge Service"
```

You can also right-click the service in `services.msc` and choose Start, Stop, or Restart.

### Startup Order

The service and Desktop App can start in either order. On startup, the service waits 2 seconds then begins checking for the Desktop App every 5 seconds. Once the Desktop App starts, the service detects it and establishes the named pipe connection automatically.

Recommended order for manual startup:
1. Start the Desktop App first (`AmbirWebScan.exe`)
2. Start the Windows Service

---

## Diagnostic Endpoints

The service exposes several endpoints useful for diagnosing issues. You can test these from a browser or with `curl`. Use the `-k` flag with curl to skip self-signed certificate verification.

### Root Endpoint

```
GET https://localhost:53052/
```

Returns basic service info. If this responds, the service is running and accepting HTTPS connections.

```json
{
  "service": "ASWCN Scanner Bridge Service",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2026-02-26T14:30:00Z"
}
```

**If this fails:** The service is not running, the port is blocked, or the certificate is invalid.

### Health Check

```
GET https://localhost:53052/health
```

Returns the health status including Desktop App connectivity:

| Status | Meaning |
|--------|---------|
| **Healthy** | Service running, Desktop App connected |
| **Degraded** | Service running, Desktop App not connected |
| **Unhealthy** | Exception occurred during health check |

**Diagnostic use:** Monitoring systems can poll this endpoint to detect when the Desktop App goes down.

### Status Endpoint

```
GET https://localhost:53052/api/twain/status
```

Returns detailed status of the entire system:

```json
{
  "success": true,
  "serviceOnline": true,
  "desktopAppConnected": true,
  "scannerStatus": {
    "isOnline": true,
    "isPaperLoaded": true,
    "isSourceOpen": false,
    "ocrEnabled": false
  },
  "timestamp": "2026-02-26T14:30:00Z"
}
```

**Key fields to check:**
- `desktopAppConnected` — Is the pipe connection established?
- `scannerStatus.isOnline` — Is a scanner detected and powered on?
- `scannerStatus.isPaperLoaded` — Is paper in the feeder?

### Scanner List

```
GET https://localhost:53052/api/twain/scanners
```

Returns all detected scanners. If this returns an empty list, the scanner may not be connected or its TWAIN driver may not be installed.

Returns HTTP 503 if the Desktop App is not connected.

---

## End-to-End Diagnostic Sequence

Run through these checks in order to isolate where a problem lies:

| Step | Test | Pass | Fail |
|------|------|------|------|
| 1 | Is the service running? (`sc query`) | Continue | Start the service |
| 2 | Does `https://localhost:53052/` respond? | Continue | Check certificate, port conflicts |
| 3 | Does `/health` return Healthy? | Continue | Desktop App not running — start it |
| 4 | Does `/api/twain/scanners` list scanners? | Continue | Scanner not connected or driver missing |
| 5 | Does a scan from the web app succeed? | Working | Check browser console for CORS/network errors |

---

## Certificate Management

The service requires an HTTPS certificate to accept browser requests. A self-signed certificate is created during installation.

### Checking the Certificate

1. Open the Certificate Manager: press Win+R, type `certlm.msc`, press Enter (requires admin)
2. Navigate to **Personal > Certificates**
3. Look for a certificate with subject **CN=ASWCN Scanner Bridge**
4. Double-click to check the **Valid from** and **Valid to** dates

The service logs the certificate thumbprint and expiry date on startup:
```
Certificate loaded: Thumbprint=ABC123..., Expires=2027-02-26
```

### Certificate Expired or Missing

If the certificate is expired or missing, the service will fail to start.

**To reinstall the certificate:**
```batch
REM Remove old certificate (if present)
ASWCNCertManager.exe remove

REM Install new certificate (requires admin)
ASWCNCertManager.exe install
```

Then restart the service.

### Browser Certificate Warning

When a user first visits `https://localhost:53052`, the browser may show a certificate warning because the certificate is self-signed. This is expected:

1. Click **Advanced**
2. Click **Proceed to localhost (unsafe)** or equivalent
3. The browser remembers this choice for future visits

:::info
The self-signed certificate is validated at startup. If the certificate will expire within 1 day, the service logs a warning and refuses to use it. Run `ASWCNCertManager.exe install` to create a fresh certificate.
:::

---

## Named Pipe Connection

The service communicates with the Desktop App through a named pipe called `ASWCNScannerBridgePipe`.

### How It Works

- The Desktop App creates and listens on the named pipe
- The service connects as a client when it needs to send a command
- Messages are length-prefixed JSON (4-byte length header + UTF-8 JSON body)
- The connection is reestablished automatically if it drops

### Connection Timeouts

| Setting | Default | Purpose |
|---------|---------|---------|
| `ConnectionTimeoutMs` | 5,000 ms | Time to wait when connecting to the pipe |
| `RequestTimeoutMs` | 300,000 ms (5 min) | Maximum time for a scan command to complete |

If the Desktop App is not running, pipe connection attempts timeout after 5 seconds.

### Background Connectivity Monitor

The service runs a background worker that continuously monitors the Desktop App connection:

- **When disconnected:** Attempts to connect every **5 seconds**
- **When connected:** Sends a heartbeat ping every **30 seconds**
- **On detection:** Logs connection state changes

This means if the Desktop App crashes, the service detects it within 30 seconds and begins reconnection attempts every 5 seconds.

---

## Log Files

### Location

```
%LOCALAPPDATA%\ASWCN\ScannerBridge\Service\Logs\
```

Log files are named `aswcn-service-YYYY-MM-DD.log` and rotate daily. The last 7 days are retained.

### Viewing Logs

```batch
REM Open log folder in Explorer
explorer %LOCALAPPDATA%\ASWCN\ScannerBridge\Service\Logs

REM View today's log
type %LOCALAPPDATA%\ASWCN\ScannerBridge\Service\Logs\aswcn-service-2026-02-26.log

REM Follow the log in real time (PowerShell)
Get-Content -Path "$env:LOCALAPPDATA\ASWCN\ScannerBridge\Service\Logs\aswcn-service-2026-02-26.log" -Wait -Tail 50
```

### Log Levels

| Level | What It Captures |
|-------|-----------------|
| **Verbose** | Everything, including framework internals |
| **Debug** | Detailed application flow (pipe messages, request details) |
| **Information** | Normal operations (startup, requests, connections) |
| **Warning** | Potential issues (timeouts, retries, disconnections) |
| **Error** | Failed operations (scan errors, pipe failures) |
| **Fatal** | Unrecoverable errors (startup failure, certificate missing) |

The default log level is **Information**. For troubleshooting, set it to **Debug** in `appsettings.json` to capture more detail.

### HTTP Request Logging

Every HTTP request is logged with method, path, status code, and elapsed time:
```
HTTP GET /api/twain/status responded 200 in 12ms
HTTP POST /api/twain/scan responded 200 in 4523ms
HTTP GET /api/twain/scanners responded 503 in 2ms
```

A 503 response on scanner endpoints indicates the Desktop App is disconnected.

### What to Look For

| Log Pattern | Meaning |
|-------------|---------|
| `"Service starting..."` | Service startup |
| `"Certificate loaded: Thumbprint=..."` | Certificate found and valid |
| `"Successfully connected to desktop application"` | Pipe connection established |
| `"Unable to connect to desktop application"` | Desktop App not reachable (repeats every 5s) |
| `"Desktop app connection status changed: False"` | Pipe connection lost |
| `"responded 503"` | Request rejected — Desktop App not connected |
| `"responded 504"` | Request timed out |
| `"Command ... timed out"` | Named pipe command exceeded timeout |
| `"Certificate not found"` | Fatal — service cannot start without certificate |

---

## Configuration

The service is configured via `appsettings.json` in the service installation directory.

### Key Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `PipeName` | `ASWCNScannerBridgePipe` | Named pipe name (must match Desktop App) |
| `Port` | `53052` | HTTPS port |
| `BindLocalhostOnly` | `true` | Only accept connections from localhost |
| `ConnectionTimeoutMs` | `5000` | Pipe connection timeout (ms) |
| `RequestTimeoutMs` | `300000` | Default scan command timeout (ms, 5 min) |
| `CertificateSubject` | `CN=ASWCN Scanner Bridge` | Certificate subject name to search for |
| `CertificateThumbprint` | *(empty)* | Specific certificate thumbprint (overrides subject search) |
| `CertificateStore` | `LocalMachine` | Certificate store location (`LocalMachine` or `CurrentUser`) |

### Environment Variable Overrides

Settings can be overridden with environment variables using the `ASWCN_` prefix:

```batch
REM Example: Change port
set ASWCN_ServiceSettings__Port=54000

REM Example: Increase scan timeout to 10 minutes
set ASWCN_ServiceSettings__RequestTimeoutMs=600000
```

:::tip
When troubleshooting timeout issues, increase `RequestTimeoutMs` temporarily. For persistent changes, edit `appsettings.json` and restart the service.
:::

---

## HTTP Status Codes

The service returns specific HTTP status codes that help diagnose issues:

| Code | Meaning | Action |
|------|---------|--------|
| **200** | Success | Request completed normally |
| **204** | No Content | CORS preflight handled successfully |
| **400** | Bad Request | Missing required parameter (e.g., scanner name) |
| **408** | Request Timeout | Client disconnected before response was sent |
| **500** | Internal Server Error | Unexpected error — check the service logs |
| **503** | Service Unavailable | Desktop App not connected — start it |
| **504** | Gateway Timeout | Scan took longer than the configured timeout |

---

## CORS and Browser Security

### CORS Policy

The service allows requests from any origin because it binds to localhost only. This is safe — no remote machine can reach the service.

### Chrome Private Network Access

When a public website (e.g., `https://yourapp.com`) makes a request to `localhost:53052`, Chrome sends a preflight request with the header `Access-Control-Request-Private-Network: true`. The service responds with `Access-Control-Allow-Private-Network: true` to allow the request without triggering a browser security prompt.

If users are seeing Chrome's "Local Network Access" permission dialog, verify:
1. The service is up to date (this header was added in a recent update)
2. Try restarting the browser to clear cached preflight results

### Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

## Common Failure Scenarios

### Service Won't Start

**Check in order:**
1. **Certificate missing** — Run `ASWCNCertManager.exe install` (admin required)
2. **Port conflict** — Another process is using port 53052. Check with:
   ```batch
   netstat -ano | findstr :53052
   ```
   If another process is using the port, stop it or change the port in `appsettings.json`.
3. **Missing .NET Runtime** — The service requires .NET 8 Runtime. Check with:
   ```batch
   dotnet --list-runtimes
   ```
4. **Check Windows Event Viewer** — Open `eventvwr.msc`, navigate to **Windows Logs > Application**, and filter by source "ASWCN"

### Desktop App Connected but Scans Fail

1. Check the service logs for error messages during the scan
2. Verify the scanner is open in the Desktop App (test with a local scan from the Desktop App UI)
3. Try increasing `RequestTimeoutMs` if scans are timing out (504 errors)
4. Check if the scanner is being used by another application

### Intermittent Disconnections

If the service repeatedly loses and regains the pipe connection:

1. Check if the Desktop App is crashing — look for gaps in the Desktop App logs
2. Check system resources (memory, CPU) — the Desktop App may be running out of memory during large scans
3. Check for antivirus or security software interfering with named pipe communication
4. Review both service and Desktop App logs around the time of disconnection

### Scan Requests Return 504 (Timeout)

1. Default timeout is 5 minutes — this may not be enough for large document batches at high resolution
2. Increase the timeout:
   ```json
   {
     "ServiceSettings": {
       "RequestTimeoutMs": 600000
     }
   }
   ```
3. Check if the Desktop App is stuck — does a local test scan from the Desktop App UI complete?
4. Check the scanner hardware — paper jams, empty feeder, or offline status can cause hangs

### API Returns 503 but Desktop App Is Running

1. The Desktop App may have started but the named pipe server hasn't initialized yet — wait 10 seconds and retry
2. The pipe name may be mismatched — verify `PipeName` in both service and Desktop App `appsettings.json` files
3. Restart the Desktop App, then restart the service
4. Check the Desktop App's activity log for pipe server errors

---

## Collecting Diagnostic Information

When escalating an issue to support, gather the following:

1. **Service logs** — Copy all files from:
   ```
   %LOCALAPPDATA%\ASWCN\ScannerBridge\Service\Logs\
   ```
2. **Desktop App logs** — Copy all files from:
   ```
   %LOCALAPPDATA%\ASWCN\ScannerBridge\Desktop\Logs\
   ```
3. **Diagnostic endpoint output** — Run and save the output of:
   ```batch
   curl -k https://localhost:53052/health
   curl -k https://localhost:53052/api/twain/status
   curl -k https://localhost:53052/api/twain/scanners
   ```
4. **Service status:**
   ```batch
   sc query "ASWCN Scanner Bridge Service"
   ```
5. **System information** — Windows version, .NET runtime version, scanner model
6. **Certificate info** — Certificate thumbprint and expiry date from the service startup log
