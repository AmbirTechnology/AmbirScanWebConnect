---
sidebar_position: 4
description: Complete reference for the ASWCNScannerBridge JavaScript SDK — methods, scan options, events, and result objects for browser-based document scanning.
keywords: [JavaScript scanner SDK, ASWCNScannerBridge, web scanning API, scan documents JavaScript]
---

# SDK Reference

Complete API reference for the `ASWCNScannerBridge` JavaScript SDK.

## Installation

Copy [`aswcn-scanner-bridge.js`](https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/sdk/js/aswcn-scanner-bridge.js) into your web application:

```html
<script src="path/to/aswcn-scanner-bridge.js"></script>
```

## Constructor

```javascript
const scanner = new ASWCNScannerBridge(baseUrl);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `baseUrl` | `string` | `null` | Service URL. If `null`, defaults to `https://localhost:53052` |

---

## Methods

### `checkServiceStatus()`

Check if the AmbirScan Web Connect service is running and ready to scan. On Windows this means both the Windows Service and the Desktop App; on macOS, the single background service.

```javascript
const isAvailable = await scanner.checkServiceStatus();
// Returns: boolean
```

---

### `getVersion()`

Get the version of AmbirScan Web Connect installed on the client machine. Useful for detecting whether a customer is running an older release.

```javascript
const version = await scanner.getVersion();
```

**Returns:** `Object`

| Field | Type | Description |
|-------|------|-------------|
| `productName` | `string` | Product display name |
| `serviceVersion` | `string` | Version of the local scanning service (always available) |
| `desktopVersion` | `string` | Windows: version of the Desktop app (only when connected). macOS: same as `serviceVersion` |
| `desktopAppConnected` | `boolean` | Windows: whether the Desktop App is currently connected. macOS: always `true` |
| `legacy` | `boolean` | `true` when the client predates the version endpoint (a `404`), indicating an older install that should be updated |

```javascript
const version = await scanner.getVersion();
if (version.legacy) {
    console.warn('Older client installed - update recommended');
} else {
    console.log(`Service ${version.serviceVersion}, Desktop ${version.desktopVersion}`);
}
```

---

### `getSources()`

Get a list of available scanners.

```javascript
const sources = await scanner.getSources();
```

**Returns:** `Array<Source>`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Scanner name (use this for `openSource()`) |
| `manufacturer` | `string` | Scanner manufacturer |
| `model` | `string` | Scanner model |
| `isOnline` | `boolean` | Whether the scanner is currently connected |
| `hasFeeder` | `boolean` | Whether the scanner has a document feeder |
| `hasFlatbed` | `boolean` | Whether the scanner has a flatbed |
| `supportsDuplex` | `boolean` | Whether the scanner supports duplex scanning |

---

### `openSource(sourceName)`

Open a scanner for scanning operations. Must be called before `scan()`.

```javascript
await scanner.openSource('TravelScan Pro');
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourceName` | `string` | Exact scanner name from `getSources()` |

---

### `closeSource()`

Close the currently open scanner. Call this when done scanning.

```javascript
await scanner.closeSource();
```

---

### `getCapabilities(sourceName)`

Get the capabilities of a specific scanner. The scanner must be opened first.

```javascript
const capabilities = await scanner.getCapabilities('TravelScan Pro');
```

**Returns:** `Capabilities`

| Field | Type | Description |
|-------|------|-------------|
| `resolutions` | `number[]` | Supported DPI values (e.g., `[150, 200, 300, 600]`) |
| `colorModes` | `string[]` | Supported color modes (e.g., `['Color', 'Grayscale', 'BlackAndWhite']`) |
| `supportsDuplex` | `boolean` | Whether duplex scanning is supported |
| `supportsAutoRotate` | `boolean` | Whether auto-rotation is supported |
| `supportsAutoDeskew` | `boolean` | Whether auto-deskew is supported |
| `supportsAutoCrop` | `boolean` | Whether auto-crop is supported |
| `supportedPageSizes` | `string[]` | Supported page sizes (e.g., `['Letter', 'Legal', 'A4', 'Auto']`) |

---

### `getStatus()`

Get the current scanner status.

```javascript
const status = await scanner.getStatus();
```

**Returns:** `Status`

| Field | Type | Description |
|-------|------|-------------|
| `isOnline` | `boolean` | Scanner is connected and powered on |
| `isPaperLoaded` | `boolean` | Paper is in the document feeder |
| `isSourceOpen` | `boolean` | A scanner source is currently open |
| `ocrEnabled` | `boolean` | OCR is enabled |

---

### `scan(params)`

Perform a scan with the specified parameters. A scanner must be opened first with `openSource()`.

```javascript
const images = await scanner.scan({
    resolution: 200,
    colorMode: 'Grayscale',
    duplexMode: 'Simplex',
    pageSize: 'Letter',
    autoRotate: false,
    autoDeskew: true,
    autoCrop: true,
    outputFormat: 'png',
    barcodeReadingEnabled: false,
    barcodeFilterLevel: 'Normal'
});
```

#### Scan Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `resolution` | `number` | `200` | Scan resolution in DPI |
| `colorMode` | `string` | `'Grayscale'` | `'Color'`, `'Grayscale'`, or `'BlackAndWhite'` |
| `duplexMode` | `string` | `'Simplex'` | `'Simplex'`, `'DuplexLongEdge'`, or `'DuplexShortEdge'` |
| `pageSize` | `string` | `'Letter'` | `'Letter'`, `'Legal'`, `'A4'`, `'A5'`, `'A6'`, `'B5'`, `'Auto'` |
| `autoRotate` | `boolean` | `false` | Auto-rotate pages to correct orientation |
| `autoDeskew` | `boolean` | `true` | Auto-straighten skewed pages |
| `autoCrop` | `boolean` | `true` | Auto-crop to page edges |
| `outputFormat` | `string` | `'png'` | `'png'`, `'jpeg'` (or `'jpg'`), `'bmp'`, `'tiff'` (or `'tif'`). Case-insensitive. |
| `jpegQuality` | `number` | `90` | JPEG quality, 1–100. Applies only when `outputFormat` is `'jpeg'`. |
| `barcodeReadingEnabled` | `boolean` | `false` | Enable barcode detection ([license required](https://ambir.com/developers/)) |
| `barcodeFilterLevel` | `string` | `'Normal'` | `'Low'`, `'Normal'`, `'High'`, `'VeryHigh'` |
| `barcodeFormats` | `string[]` | `[]` (all) | Only look for these symbologies, e.g. `['Pdf417']`. See [Choosing Symbologies](./guides/barcode-reading.md#choosing-symbologies) |
| `barcodeStopAfterFirst` | `boolean` | `false` | Stop reading a page as soon as one barcode is found |
| `ocrEnabled` | `boolean` | `false` | Enable OCR text extraction ([license required](https://ambir.com/developers/)) |
| `requestTimeoutSeconds` | `number` | `0` | Timeout in seconds (0 = no timeout) |
| `transferMode` | `string` | *(desktop setting, native)* | `'Auto'`, `'Native'`, or `'Buffered'`. Rarely needed. See [Transfer Mode](#transfer-mode) |

`colorMode`, `duplexMode`, `pageSize`, `transferMode` and `barcodeFilterLevel` values are
case-sensitive on at least one platform — use them exactly as written above. In `scan()`, an unrecognised value silently falls back to a
default rather than failing the scan — for example, `colorMode: 'grayscale'` produces a color
scan. `enableAutoScan()` and the REST `/api/twain/scan` endpoint reject an invalid value with
HTTP 400 instead.

:::note Output format in 4.1.0.0
Releases before 4.1.0.0 returned PNG for any lowercase `outputFormat` — `'jpeg'`, `'tiff'`
and `'bmp'` included — and ignored `jpegQuality`. From 4.1.0.0 the requested format is
returned; on Windows, JPEG is encoded at the requested `jpegQuality`. Use
[`getVersion()`](#getversion) if you need to know which behaviour a client has.
:::

#### Transfer Mode

`transferMode` selects how TWAIN moves image data from the scanner driver into the
application. **Native transfer is the default and is the right choice for almost every
scanner** — you should not normally need to set this parameter at all.

| Value | Behaviour |
|-------|-----------|
| `'Auto'` | Use the configured default, which is native transfer |
| `'Native'` | The driver returns a complete image in one transfer |
| `'Buffered'` | The driver returns strips that TWAIN reassembles |

Buffered transfer is offered only as an escape hatch. Several scanner drivers reassemble
those strips incorrectly, which shows up as **sheared pages, colour fringing, blank or
black pages, or auto-crop being silently ignored**. Set `'Buffered'` only if a specific
scanner is documented to require it, or if support asks you to.

Omit the parameter to use whatever is configured in the desktop app under
**Settings → Scanner Defaults → TWAIN Transfer Mode** (`Native` out of the box). A value
sent with the scan request overrides that setting for the one scan.

```javascript
// Rarely needed - only for a scanner that specifically requires buffered transfer
const images = await scanner.scan({ transferMode: 'Buffered' });
```

:::note
`transferMode` was added in a later release. Installations older than that ignore the
parameter instead of failing, so a scan that specifies it still succeeds — just with the
scanner's previous transfer mode. Check the installed version with `getVersion()` if the
setting appears to have no effect.
:::

#### Scanned Image Response

**Returns:** `Array<ScannedImage>`

| Field | Type | Description |
|-------|------|-------------|
| `base64Data` | `string` | Base64-encoded image data |
| `mimeType` | `string` | MIME type (e.g., `image/png`) |
| `pageNumber` | `number` | Page number (1-based) |
| `width` | `number` | Image width in pixels |
| `height` | `number` | Image height in pixels |
| `resolution` | `number` | Actual scan resolution in DPI |
| `format` | `string` | Image format name |
| `fileSizeBytes` | `number` | Image file size in bytes |
| `ocrText` | `string` | Extracted OCR text (if OCR enabled) |
| `barcodes` | `array` | Detected barcodes (if barcode reading enabled) |

#### Barcode Result

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Decoded barcode text |
| `barcodeType` | `string` | Barcode format (e.g., `CODE_128`, `PDF_417`, `QR_CODE`) |
| `confidence` | `number` | Confidence score (0.0 - 1.0) |
| `isAamva` | `boolean` | `true` if barcode contains AAMVA driver's license data |
| `parsedData` | `string` | Parsed AAMVA data (when `isAamva` is `true`) |

---

### `checkPaperLoaded()`

Check if paper is loaded in the scanner feeder.

```javascript
const hasPaper = await scanner.checkPaperLoaded();
// Returns: boolean
```

---

### `checkScannerOnline()`

Check if the scanner is online and connected.

```javascript
const isOnline = await scanner.checkScannerOnline();
// Returns: boolean
```

---

### `enableAutoScan(params)`

Enable auto-scan mode. The scanner watches its paper sensor and automatically captures each document as it is inserted — no per-page `scan()` call is needed. Captured images are delivered through the auto-scan event stream (see [`startAutoScan()`](#startautoscanhandlers)).

```javascript
await scanner.enableAutoScan({
    resolution: 300,
    colorMode: 'Color',
    autoCrop: true
});
```

Accepts the same [scan parameters](#scan-parameters) as `scan()`, with one exception: the
output format is set with `imageFormat` (`'Png'`, `'Jpeg'`, `'Tiff'` or `'Bmp'`) rather than
`outputFormat`. Auto-scan does not recognise `outputFormat` and returns PNG unless
`imageFormat` is set. **Returns:** `{ success, message }`.

Auto-scan stays on only while a page is collecting images through
[`startAutoScan()`](#startautoscanhandlers). If nothing collects images for five minutes —
the tab was closed, the page reloaded, or the computer slept — auto-scan switches itself off
and discards any pages that were scanned but never delivered. Call `enableAutoScan()` again
when the page comes back.

---

### `disableAutoScan()`

Disable auto-scan mode and stop watching the paper sensor. Pages that were scanned but not
yet delivered to the event stream are discarded.

```javascript
await scanner.disableAutoScan();
// Returns: { success, message }
```

---

### `startAutoScan(handlers)`

Open the auto-scan event stream and receive each document as it is scanned. Call `enableAutoScan()` first. Uses [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) under the hood and returns the underlying `EventSource` so you can stop listening later.

```javascript
const stream = await scanner.startAutoScan({
    onImage: (image) => {
        const img = document.createElement('img');
        img.src = `data:${image.mimeType};base64,${image.base64Data}`;
        document.body.appendChild(img);
    },
    onDisabled: () => console.log('Auto-scan turned off'),
    onError: (err) => console.warn('Stream error', err)
});
```

| Handler | Type | Description |
|---------|------|-------------|
| `onImage` | `function` | Called with each scanned image object (same shape as a [scanned image](#scanned-image-response)) |
| `onDisabled` | `function` | Optional. Called when auto-scan is turned off (server-side or via `disableAutoScan()`); the stream closes automatically |
| `onError` | `function` | Optional. Called on a stream error; the payload may be `null` on a connection drop |

**Returns:** `Promise<EventSource>`

---

### `stopAutoScan(source)`

Close an auto-scan event stream returned by `startAutoScan()`.

```javascript
scanner.stopAutoScan(stream);
```

---

### `sendCommand(method, params)`

Send a raw TWAIN Direct command. Used internally by other methods but available for advanced use cases.

```javascript
const response = await scanner.sendCommand('getSources');
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `method` | `string` | TWAIN Direct method name |
| `params` | `object` | Optional parameters |

---

## Platform Differences

The SDK, the REST API and the request and response formats are the same on Windows and macOS —
one web application works against both. What differs is the scanning and recognition engine
underneath each client. A few options control features of the Windows engine that have no
equivalent on macOS. On macOS they are **ignored, not rejected** — the scan still succeeds.

### Scan options

| Option | Windows | macOS |
|--------|---------|-------|
| `pageSize` | Applied | Ignored — the scanner's full scan area is captured |
| `autoDeskew`, `autoCrop` | Two separate switches, when the scanner driver supports them | One combined feature: setting either turns on both, when the scanner driver supports it |
| `autoRotate` | Applied when the scanner driver supports it | Applied when the scanner driver supports it |
| `jpegQuality` | Applied | Ignored — the scanner driver chooses the JPEG quality |
| `transferMode` | Applied | Ignored — not applicable on macOS |
| `barcodeFormats`, `barcodeStopAfterFirst` | Applied | Ignored — every symbology is searched |
| `barcodeFilterLevel` | Applied | Applied, with different thresholds. `VeryHigh` also discards barcodes shorter than six characters. |
| `requestTimeoutSeconds: 0` | No timeout | A 300-second timeout |
| Auto-scan | Stays on until disabled, or until no page collects images for five minutes | Same, and also switches itself off after three scans in a row that fail or return no pages |

### Results and other calls

| Area | Windows | macOS |
|------|---------|-------|
| `getSources()` | `hasFeeder`, `hasFlatbed` and `supportsDuplex` are placeholder values (`true`, `true`, `false`) until the scanner is opened | These three are `false` until the scanner is opened |
| Barcode `barcodeType` | The 13 names in [Supported Barcode Formats](./guides/barcode-reading.md#supported-barcode-formats) | The same names, except that `UPC_A` is never reported; additional symbology names may also appear |
| Barcode `confidence` | Calculated by the Windows client | Calculated differently, so values aren't comparable between platforms |
| Duplicate barcodes | Removed | Not removed — the same barcode can appear twice |
| OCR (`ocrText`) | English | The OCR language cannot be chosen in this release |
| `getVersion()` | `serviceVersion` and `desktopVersion` are reported separately | There is no desktop app: `desktopVersion` matches `serviceVersion` and `desktopAppConnected` is always `true` |
| Licensing and settings | Desktop app (system tray) | The admin page at `https://localhost:53052/admin` — see the [macOS Installer guide](./guides/macos-installer.md#licensing-and-settings) |

Your web application cannot detect which platform it is talking to in this release. Because
options that don't apply are ignored rather than rejected, the same scan request works on
both.

---

## Complete Example

```javascript
const scanner = new ASWCNScannerBridge();

async function scanDocument() {
    // 1. Check service availability
    if (!await scanner.checkServiceStatus()) {
        alert('Scanner service is not running');
        return;
    }

    // 2. Get and display available scanners
    const sources = await scanner.getSources();
    if (sources.length === 0) {
        alert('No scanners found');
        return;
    }

    // 3. Open the first available scanner
    const scannerName = sources[0].name;
    await scanner.openSource(scannerName);

    // 4. Check capabilities
    const caps = await scanner.getCapabilities(scannerName);
    console.log('Resolutions:', caps.resolutions);
    console.log('Duplex:', caps.supportsDuplex);

    // 5. Scan with barcode detection
    try {
        const images = await scanner.scan({
            resolution: 300,
            colorMode: 'Color',
            barcodeReadingEnabled: true
        });

        images.forEach(image => {
            // Display the image
            const img = document.createElement('img');
            img.src = `data:${image.mimeType};base64,${image.base64Data}`;
            document.body.appendChild(img);

            // Show barcodes
            image.barcodes?.forEach(bc => {
                console.log(`${bc.barcodeType}: ${bc.text}`);
            });
        });
    } finally {
        // 6. Always close the scanner
        await scanner.closeSource();
    }
}
```

## Error Handling

All SDK methods throw errors on failure. Wrap calls in try/catch:

```javascript
try {
    const images = await scanner.scan({ resolution: 300 });
} catch (error) {
    if (error.message.includes('503')) {
        console.error('Desktop app is not connected');
    } else if (error.message.includes('504')) {
        console.error('Scan timed out');
    } else {
        console.error('Scan failed:', error.message);
    }
}
```
