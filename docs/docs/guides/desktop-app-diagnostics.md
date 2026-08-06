---
sidebar_position: 4
description: Use the Desktop App's diagnostic interface to troubleshoot scanner detection, TWAIN sources, and connectivity on a client machine.
keywords: [scanner diagnostics, TWAIN source troubleshooting, desktop app logs, system tray scanner app]
---

# Desktop App Diagnostics

The AmbirScan Web Connect Desktop App provides a diagnostic interface for technicians to troubleshoot scanner and connectivity issues on client machines. End users do not normally interact with this application — it runs silently in the system tray. However, the UI is available for on-site or remote diagnostic sessions.

## Opening the Desktop App

The Desktop App runs in the **Windows system tray** (notification area). To open the main window:

1. Locate the AmbirScan icon in the system tray (you may need to click the **^** arrow to expand hidden icons)
2. **Double-click** the tray icon, or **right-click** and select **Open**

If the app is not running, launch it from the Start Menu shortcut at `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\AmbirScan Web Connect`, or run `AmbirWebScan.exe` from the installation directory.

:::note
The installer does not start the Desktop App, so on a machine that has just been installed and not yet signed out of, it will not be running or present in the tray. Start it from the shortcut above.
:::

:::info Single Instance
Only one instance of the Desktop App can run at a time. If you try to launch a second instance, you'll see a message indicating it's already running.
:::

---

## Main Window Overview

The main window is divided into four sections:

### 1. Service Status Panel

Located at the top, this panel shows the health of the system at a glance:

| Indicator | Meaning |
|-----------|---------|
| **Service Status** | Whether the Desktop App's internal services are running (green = Running) |
| **Pipe Connection** | Connection status to the Windows Service — green = Connected, orange = Waiting, red = Disconnected |
| **Last Activity** | Timestamp of the most recent scanner interaction |

**What to check:**
- If **Pipe Connection** is red or orange, the Windows Service may not be running. Open `services.msc` and look for "AmbirScan Web Connect Service".
- If the service is running but the pipe shows disconnected, try restarting both the service and the Desktop App.

### 2. Scanner Panel

The middle section provides scanner selection and control:

- **Scanner dropdown** — Lists all detected TWAIN scanners
- **Refresh** — Re-scans for available TWAIN devices
- **Open** — Opens the selected scanner for operations
- **Close** — Releases the currently open scanner
- **Test Scan** — Performs a quick single-page scan (150 DPI, Color, Letter)
- **Quick Scan** — Opens an advanced scan dialog with full parameter control
- **Scanner Info** — Displays the selected scanner's manufacturer, model, supported resolutions, and features (ADF, Flatbed, etc.)

**What to check:**
- If the scanner dropdown is empty after clicking **Refresh**, the scanner may not be connected, powered on, or its TWAIN driver may not be installed.
- After clicking **Open**, the Scanner Info label should populate with capabilities. If it shows an error, the TWAIN driver may be malfunctioning.

### 3. Activity Log

The bottom section is a color-coded, timestamped log of all operations:

| Color | Meaning |
|-------|---------|
| **Blue** | Initialization events, incoming commands from the service |
| **Green** | Successful operations (scanner opened, scan completed) |
| **Gray** | Processing steps (TWAIN initialization, image transfer) |
| **Orange** | Warnings (scanner disconnected, timeout approaching) |
| **Red** | Errors (scan failed, TWAIN error, pipe disconnected) |

Each entry is prefixed with a timestamp in `[HH:mm:ss]` format. The log holds up to 500 entries and can be cleared with the **Clear** button.

**What to check:**
- Look for red entries to identify errors. The error messages usually include a description of what failed.
- Watch the log during a scan to see each stage: opening source, acquiring pages, processing images, and closing source.

### 4. Status Bar

The bar at the very bottom shows three pieces of information:
- **Left:** Current operation status (Ready, Scanning, Error, etc.)
- **Middle:** Service connection indicator
- **Right:** Currently open scanner name

---

## Diagnostic Workflows

### Verifying Scanner Connectivity

1. Open the Desktop App
2. Click **Refresh** in the Scanner panel
3. Confirm the expected scanner appears in the dropdown
4. Select the scanner and click **Open**
5. Verify the Scanner Info label shows capabilities (resolutions, features)
6. Click **Close** when done

If the scanner does not appear:
- Check that the scanner is physically connected and powered on
- Verify the TWAIN driver is installed (check in the scanner manufacturer's software)
- Try disconnecting and reconnecting the USB cable
- Restart the Desktop App after connecting the scanner

### Performing a Test Scan

1. Select and **Open** a scanner
2. Click **Test Scan** for a quick single-page scan, or **Quick Scan** for full control over parameters
3. If the scan succeeds, a preview window opens showing the scanned image
4. Check the Activity Log for timing information and any warnings

If the scan fails:
- Check the Activity Log for red error messages
- Ensure paper is loaded in the feeder (for ADF scanners)
- Try a lower resolution (e.g., 150 DPI) to rule out memory issues
- Close and re-open the scanner source

### Verifying Service Connectivity

1. Check the **Pipe Connection** indicator in the Service Status panel
   - **Green (Connected):** The Windows Service is communicating with the Desktop App
   - **Orange (Waiting):** The Desktop App is listening but the service hasn't connected yet
   - **Red (Disconnected):** No connection — the service may be stopped
2. If disconnected, verify the Windows Service is running:
   - Open `services.msc` (Win+R > type `services.msc`)
   - Find "AmbirScan Web Connect Service"
   - Start it if stopped, or restart it if it appears stuck

### End-to-End Verification

To confirm the full scanning pipeline is working:

1. Verify the Desktop App shows **Pipe Connection: Connected** (green)
2. Open a browser and navigate to `https://localhost:53052/health` — should return `{"status":"Healthy"}`
3. Navigate to `https://localhost:53052/api/twain/status` — should show `"desktopAppConnected": true`
4. Navigate to `https://localhost:53052/api/twain/scanners` — should list available scanners
5. Perform a test scan from the Desktop App to verify scanner hardware
6. Perform a scan from the web application or sample diagnostic page to verify the full chain

---

## Quick Scan Dialog

The Quick Scan dialog provides full control over scan parameters, useful for testing specific configurations:

### Basic Settings
- **Scanner** — Select from available scanners
- **Resolution** — DPI value (populated from scanner capabilities, e.g., 75, 150, 300, 600)
- **Color Mode** — Color, Grayscale, or Black & White
- **Page Size** — Letter, Legal, A4, A3, Auto, etc.
- **Format** — Output image format (PNG, JPEG, TIFF, BMP)

### Advanced Settings
- **Paper Source** — Auto, Flatbed, Feeder, or Manual Feeder
- **Duplex Mode** — Simplex, Duplex (long edge), or Duplex (short edge)
- **Max Pages** — Limit the number of pages scanned (0 = unlimited)
- **Auto-rotate** — Automatically correct page orientation
- **Auto-deskew** — Straighten skewed pages
- **Auto-crop** — Crop to page edges
- **Remove blank pages** — Skip blank pages in feeder
- **Show scanner interface** — Display the scanner's native TWAIN UI dialog

:::tip
Options that the scanner doesn't support will be grayed out. This is a quick way to see what features a particular scanner model supports.
:::

---

## Scan Preview Window

After a successful scan, the preview window displays all captured pages:

### Navigation
- **Thumbnail panel** (left side) — Click thumbnails to switch between pages
- **Full preview** (right side) — Shows the selected page at detail

### Tools
- **Zoom In / Zoom Out** — Magnify or reduce the preview
- **Fit** — Fit the image to the window
- **100%** — Show at actual pixel size
- **Rotate Left / Rotate Right** — Rotate the image 90 degrees

### Image Information
The info bar below the preview shows:
- Page number
- Dimensions (width x height in pixels)
- Resolution (DPI)
- Color mode
- File size

### Saving Images
- **Save Current** — Save the currently viewed page to a file
- **Save All** — Save all pages to a folder (named `scan_page_1.png`, `scan_page_2.png`, etc.)
- Supported formats: PNG, JPEG, TIFF, BMP

---

## Log Viewer

Access via **Help > View Logs** from the menu bar. The Log Viewer provides detailed diagnostic information beyond what the Activity Log shows.

### Features
- **File list** (left panel) — Shows all daily log files sorted by most recent, with file sizes and modification times
- **Log content** (right panel) — Displays the selected log file with color-coded syntax highlighting:
  - **Red:** Errors and fatal messages (`[ERR]`, `[FTL]`)
  - **Orange:** Warnings (`[WRN]`)
  - **Green:** Informational messages (`[INF]`)
  - **Gray:** Debug messages (`[DBG]`)

### Tools
- **Refresh** — Reload the file list
- **Open Folder** — Open the log directory in Windows Explorer (useful for copying logs to send to support)
- **Clear Old Logs** — Delete log files older than 7 days

### Real-Time Monitoring
The Log Viewer automatically updates when new log entries are written. If you have a log file selected, new entries will appear as they are logged. This is useful for watching scan operations in real time.

### Log File Location
```
%LOCALAPPDATA%\ASWCN\ScannerBridge\Desktop\Logs\
```

Log files are named `desktop-YYYY-MM-DD.log` and rotate daily. The last 7 days of logs are retained by default.

---

## Settings

Access via **File > Settings** from the menu bar.

### General Tab
| Setting | Description |
|---------|-------------|
| **Start minimized** | Launch the app hidden in the system tray |
| **Start with Windows** | Add the app to Windows startup (writes to the registry) |
| **Show preview after scanning** | Automatically open the preview window after a scan completes |
| **OCR Enabled** | Enable Tesseract OCR text extraction during scans |

### Scanner Defaults Tab
| Setting | Description |
|---------|-------------|
| **Default Resolution** | DPI used for test scans and when no resolution is specified |
| **Default Color Mode** | Color mode used when not specified |
| **Default Page Size** | Paper size used when not specified |
| **Default Format** | Image output format used when not specified |
| **Enable Third-Party Scanners** | Extend TWAIN support to non-Ambir scanners |

### Logging Tab
| Setting | Description |
|---------|-------------|
| **Enable logging** | Turn file logging on or off |
| **Log Level** | Minimum severity to log (Verbose, Debug, Information, Warning, Error) |
| **Log Path** | Directory where log files are written |
| **Open Log Folder** | Quick access to the log directory |

:::tip Diagnostic Tip
When troubleshooting, temporarily set the **Log Level** to **Debug** or **Verbose** to capture maximum detail. Remember to set it back to **Information** afterward to avoid filling the disk with log data.
:::

---

## Scan Progress Dialog

During a scan (initiated from Quick Scan or a web application request), a progress dialog shows:

- **Status message** — Current operation (Initializing, Scanning, Processing, Transferring)
- **Page counter** — Number of pages scanned so far
- **Progress bar** — Visual progress indicator (animated when progress percentage is unknown)
- **Elapsed time** — Running timer showing how long the scan has been in progress
- **Cancel button** — Abort the current scan (with confirmation prompt)

The dialog title updates to reflect the current stage. On completion, the button changes to **Close** and the progress bar fills to 100%.

---

## Common Diagnostic Scenarios

### "Service: Disconnected" but Service is Running
1. Restart the Windows Service (`services.msc` > Restart)
2. If that doesn't help, close the Desktop App and restart it
3. Check the log files for pipe connection errors
4. Verify no firewall or security software is blocking named pipe communication

### Scanner Appears but Won't Open
1. Check if another application has the scanner open (TWAIN is single-access)
2. Close any other scanning software
3. Try clicking **Close** first (in case a stale session exists), then **Open** again
4. Restart the Desktop App
5. Check the TWAIN driver is up to date

### Scans Complete but Images Are Blank or Corrupted
1. Try a **Test Scan** from the Desktop App to isolate the issue
2. Check the preview window — if images look correct here, the issue is in transmission
3. Try a different output format (e.g., JPEG instead of PNG)
4. Try a lower resolution
5. Check the log files for image processing errors

### Web Application Can't Reach the Service
1. Verify **Pipe Connection** is green in the Desktop App
2. Test `https://localhost:53052/health` in the browser
3. If the health check fails, the Windows Service may need to be restarted
4. If the health check works but the web app fails, check for CORS or certificate issues (see the [Browser Security guide](./browser-security.md))

### Collecting Diagnostic Information for Support
When contacting support, gather:
1. **Log files** — Use **Help > View Logs > Open Folder** and zip the contents
2. **Scanner Info** — Open the scanner and note the capabilities shown in the Scanner Info label
3. **Service Status** — Screenshot the main window showing the Service Status panel
4. **Browser console** — If the issue is web-side, include the browser developer console output (F12 > Console)
5. **System info** — Windows version, scanner model, browser and version
