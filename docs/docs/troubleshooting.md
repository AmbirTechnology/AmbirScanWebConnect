---
sidebar_position: 6
---

# Troubleshooting

Common issues and their solutions.

## Service Not Responding

**Symptom:** `checkServiceStatus()` returns `false`, or requests to `https://localhost:53052` fail.

**Solutions:**
1. Check that the **AmbirScan Web Connect Desktop App** is running (look for the icon in the Windows system tray)
2. Check that the **Windows Service** is running:
   - Open **Services** (Win+R > `services.msc`)
   - Look for "AmbirScan Web Connect Service"
   - Start it if it's stopped
3. Verify the port is not blocked: navigate to `https://localhost:53052/health` in your browser

---

## Certificate Warning

**Symptom:** Browser shows "Your connection is not private" or similar SSL warning.

**Solutions:**
1. Navigate directly to `https://localhost:53052/health`
2. Click **Advanced** > **Proceed to localhost**
3. The certificate will be remembered for future visits

If the certificate is missing entirely, re-run the installer or run the certificate manager:
```cmd
ASWCNCertManager.exe install
```

---

## No Scanners Found

**Symptom:** `getSources()` returns an empty array.

**Solutions:**
1. Ensure a TWAIN-compatible scanner is physically connected and powered on
2. Install the scanner's TWAIN driver (available from the scanner manufacturer's website)
3. Verify the scanner works in other TWAIN applications
4. Restart the Desktop App after connecting a new scanner

---

## Scan Timeout

**Symptom:** Scan request times out or takes too long.

**Solutions:**
1. Increase the `requestTimeoutSeconds` parameter (set to `0` for no timeout)
2. Check that paper is loaded in the scanner feeder
3. Lower the resolution (e.g., 200 DPI instead of 600 DPI) for faster scans
4. Disable barcode reading if not needed (it adds 2-5 seconds of processing)

---

## CORS Errors

**Symptom:** Browser console shows CORS-related errors.

**Solutions:**
1. Ensure you're using the SDK, which sets `mode: 'cors'` automatically
2. If making direct `fetch` calls, include:
   ```javascript
   fetch(url, {
       mode: 'cors',
       credentials: 'include'
   });
   ```
3. If using Chrome and seeing Private Network Access errors, ensure the service is up to date

---

## Desktop App Not Connected (503 Error)

**Symptom:** API returns HTTP 503 with "Desktop application not connected".

**Solutions:**
1. The Desktop App may have been closed — restart it from the Start Menu
2. If the Desktop App is running but the service can't connect, restart both:
   - Close the Desktop App (right-click system tray icon > Exit)
   - Restart the service (`services.msc` > Restart)
   - Start the Desktop App

---

## Scanner Opens But Scan Fails

**Symptom:** `openSource()` succeeds but `scan()` fails.

**Solutions:**
1. Check that paper is loaded (use `checkPaperLoaded()`)
2. Verify the scanner is online (use `checkScannerOnline()`)
3. Try a different scan configuration (lower resolution, different color mode)
4. Close and re-open the scanner source

---

## Sheared, Colour-Fringed, Black or Uncropped Pages

**Symptom:** Scanned pages come back slanted like a parallelogram, show red/green/blue
edges and horizontal streaking, arrive entirely black, or ignore auto-crop and return a
full page. The same page looks fine in the scanner's own software.

**Explanation:** These are all symptoms of buffered TWAIN transfer. In that mode the
driver hands back the image in strips for TWAIN to reassemble, and some drivers describe
those strips incorrectly, so each row of pixels ends up offset from the one above it.

**Solution:** Use native transfer, which is the default.

If you are seeing this, something has overridden that default. Check, in order:

1. The `transferMode` your application sends with the scan request. Remove it, or set it
   explicitly:

   ```javascript
   const images = await scanner.scan({ transferMode: 'Native' });
   ```

2. The machine-wide setting in the desktop app under
   **Settings → Scanner Defaults → TWAIN Transfer Mode**. It should be `Native` or `Auto`.

3. The installed version. Releases before transfer mode was configurable always used
   buffered transfer and ignore the parameter. Confirm with `getVersion()`.

If native transfer is confirmed and pages are still malformed, the problem is elsewhere —
report the scanner model to support.

---

## Multiple Browser Tabs

**Symptom:** Scanning works in one tab but fails in another.

**Explanation:** Only one scanner source can be open at a time. If Tab A has a scanner open, Tab B cannot open the same scanner.

**Solution:** Close the scanner source in the inactive tab before scanning in the active tab, or design your application to handle single-tab scanning.

---

## Diagnostic Tool

Use the included diagnostic page ([`sample-app/scanner-diagnostic.html`](https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/sample-app/scanner-diagnostic.html)) to test individual API calls and inspect raw responses. This helps isolate whether an issue is in your application code or the scanner service.

---

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/AmbirTechnology/AmbirScanWebConnect/issues) for known problems
2. Open a new issue with:
   - Browser and version
   - Scanner model
   - Error message or screenshot
   - Steps to reproduce
3. Contact Ambir support at support@ambir.com
