---
sidebar_position: 4
description: Enable hands-free auto-scan so the scanner's paper sensor drives the workflow, and stream pages to the browser as they are captured.
keywords: [auto scan, hands free scanning, paper sensor, batch scanning browser, server sent events scanning]
---

# Auto Scan

Auto Scan lets the scanner drive the workflow: instead of calling `scan()` for every
document, you enable auto-scan once and the scanner watches its paper sensor,
automatically capturing each page as it is inserted. Captured images stream to the
browser in real time.

This is ideal for high-throughput, hands-free workstations (mailrooms, check-in desks,
batch document capture) where an operator feeds documents one after another.

## How it works

1. **Enable** auto-scan with your desired scan settings.
2. **Listen** to the auto-scan event stream. Each document scanned is delivered to your
   `onImage` callback as it is captured.
3. **Disable** auto-scan when you are done.

Under the hood the SDK opens a [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
connection to `GET /api/twain/autoscan/events`, so images arrive without polling.

## Basic usage

```javascript
const scanner = new ASWCNScannerBridge();

// 1. Open a scanner
const sources = await scanner.getSources();
await scanner.openSource(sources[0].name);

// 2. Enable auto-scan (accepts the same parameters as scan(); see the
//    note on imageFormat below)
await scanner.enableAutoScan({
    resolution: 300,
    colorMode: 'Color',
    autoCrop: true
});

// 3. Receive each document as it is scanned
const stream = await scanner.startAutoScan({
    onImage: (image) => {
        const img = document.createElement('img');
        img.src = `data:${image.mimeType};base64,${image.base64Data}`;
        document.getElementById('results').appendChild(img);
    },
    onDisabled: () => console.log('Auto-scan stopped'),
    onError: (err) => console.warn('Auto-scan stream error', err)
});
```

The `image` object delivered to `onImage` has the same shape as a normal
[scanned image](../sdk-reference#scanned-image-response), including `ocrText` and
`barcodes` when those features are enabled.

## Stopping

Turn off auto-scan and close the stream when finished:

```javascript
await scanner.disableAutoScan();
scanner.stopAutoScan(stream);
```

Calling `disableAutoScan()` also causes the server to emit a `disabled` event, which
triggers your `onDisabled` handler and closes the stream automatically. Calling
`stopAutoScan(stream)` on the client is still good practice to release the connection
immediately.

## Notes

- **Open a scanner first.** Auto-scan operates on the currently open source. If no
  source is open, `enableAutoScan()` returns an error.
- **One stream at a time.** Open a single auto-scan event stream per page. Closing and
  reopening is fine, but avoid multiple concurrent streams.
- **Barcode and OCR** work the same as in a normal scan — pass
  `barcodeReadingEnabled: true` or `ocrEnabled: true` to `enableAutoScan()` (both are
  [premium features](https://ambir.com/developers/)).
- **Connection drops.** If the connection to the scanner service drops (on Windows, for
  example, when the Desktop App closes), the stream emits an `error` event and ends.
  Re-check `checkServiceStatus()` before re-enabling.
- **macOS: empty scans.** On macOS, auto-scan also switches itself off after three scans in
  a row that fail or return no pages. Your `onDisabled` handler is called; re-enable when ready.
- **Auto-scan switches itself off when nobody is collecting.** It stays on only while a
  page holds the event stream open. If no page collects images for five minutes — the tab
  was closed, the page reloaded, or the computer slept — auto-scan disables itself and
  discards any pages that were scanned but never delivered. Re-enable it when your page
  loads rather than assuming it is still on.
- **Disabling discards undelivered pages.** `disableAutoScan()` throws away pages that
  were scanned but not yet delivered, so they never appear in a later session.
- **Output format.** Auto-scan takes the output format as `imageFormat` (`'Png'`,
  `'Jpeg'`, `'Tiff'` or `'Bmp'`); `outputFormat` is not recognised here, so auto-scan
  returns PNG unless `imageFormat` is set.

## REST equivalent

If you are not using the JavaScript SDK, the same flow is available over the
[REST API](../rest-api#enable-auto-scan): `POST /api/twain/autoscan/enable`,
`GET /api/twain/autoscan/events` (SSE), and `POST /api/twain/autoscan/disable`.
