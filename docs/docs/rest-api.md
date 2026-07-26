---
sidebar_position: 5
---

# REST API Reference

If you prefer to use the REST API directly instead of the JavaScript SDK, the service exposes the following endpoints on `https://localhost:53052`.

## Authentication

No authentication is required. The service is localhost-only and relies on the operating system's network isolation.

## CORS

The service accepts requests from any origin and supports Chrome's Private Network Access preflight headers.

---

## Endpoints

### Health Check

```
GET /health
```

Returns service health status.

**Response:**

```json
{
  "status": "Healthy"
}
```

---

### Get Service Status

```
GET /api/twain/status
```

Returns the status of the service and desktop app connectivity.

**Response (200):**

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
  "timestamp": "2026-02-25T12:00:00Z"
}
```

---

### Get Version

```
GET /api/twain/version
```

Returns the installed version of AmbirScan Web Connect. The service version is always
available; the desktop version is included only when the desktop app is connected.

**Response (200):**

```json
{
  "success": true,
  "productName": "AmbirScan Web Connect",
  "serviceVersion": "4.0.0.10",
  "desktopVersion": "4.0.0.10",
  "desktopAppConnected": true,
  "timestamp": "2026-02-25T12:00:00Z"
}
```

Clients installed before this endpoint existed return `404`, which itself signals a
legacy install that should be updated.

---

### List Scanners

```
GET /api/twain/scanners
```

Returns a list of all available TWAIN scanners.

**Response (200):**

```json
{
  "success": true,
  "scanners": [
    {
      "name": "TravelScan Pro",
      "manufacturer": "Ambir Technology",
      "model": "Ambir Technology",
      "isOnline": true,
      "hasFeeder": true,
      "hasFlatbed": true,
      "supportsDuplex": false
    }
  ],
  "count": 1
}
```

**Response (503):**

```json
{
  "success": false,
  "error": "Desktop application not connected"
}
```

---

### Get Scanner Capabilities

```
GET /api/twain/scanners/{name}/capabilities
```

Returns the capabilities of a specific scanner. The scanner name must be URL-encoded.

**Example:**

```
GET /api/twain/scanners/TravelScan%20Pro/capabilities
```

**Response (200):**

```json
{
  "success": true,
  "capabilities": {
    "resolutions": [150, 200, 300, 600],
    "colorModes": ["Color", "Grayscale", "BlackAndWhite"],
    "supportsDuplex": false,
    "supportsAutoRotate": true,
    "supportsAutoDeskew": true,
    "supportsAutoCrop": false,
    "supportedPageSizes": ["Letter", "Legal", "A4", "Auto"]
  }
}
```

---

### Scan

```http
POST /api/twain/scan
Content-Type: application/json
```

Perform a scan. Handles opening the scanner, scanning, and returning results.

**Request Body:**

```json
{
  "scannerName": "TravelScan Pro",
  "parameters": {
    "resolution": 200,
    "colorMode": "Grayscale",
    "duplexMode": "Simplex",
    "pageSize": "Letter",
    "autoRotate": false,
    "autoDeskew": true,
    "autoCrop": true,
    "outputFormat": "png",
    "barcodeReadingEnabled": false,
    "barcodeFilterLevel": "Normal",
    "ocrEnabled": false,
    "requestTimeoutSeconds": 0,
    "transferMode": "Auto"
  }
}
```

`transferMode` is optional (`"Auto"`, `"Native"` or `"Buffered"`) and rarely needed. Omit
it to use the mode configured in the desktop app, which defaults to native transfer; see
[Transfer Mode](./sdk-reference.md#transfer-mode).

**Response (200):**

```json
{
  "success": true,
  "status": "Success",
  "message": "Scan completed successfully",
  "images": [
    {
      "base64Data": "/9j/4AAQSkZJRg...",
      "mimeType": "image/png",
      "pageNumber": 1,
      "width": 2550,
      "height": 3300,
      "resolution": 300,
      "format": "Png",
      "fileSizeBytes": 1234567,
      "ocrText": "",
      "barcodes": []
    }
  ],
  "imageCount": 1,
  "elapsedMs": 4500
}
```

**Response with Barcodes** (when `barcodeReadingEnabled: true`):

```json
{
  "success": true,
  "images": [
    {
      "base64Data": "...",
      "barcodes": [
        {
          "text": "ABC123456",
          "barcodeType": "CODE_128",
          "confidence": 0.95
        },
        {
          "text": "DLDAQ12345...",
          "barcodeType": "PDF_417",
          "confidence": 0.88
        }
      ]
    }
  ]
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Scanner name is required |
| 503 | Desktop application not connected |
| 504 | Scan timed out |
| 500 | Internal server error |

---

### Cancel Scan

```http
POST /api/twain/cancel
Content-Type: application/json
```

Cancel an active scan operation.

**Request Body:**

```json
{
  "requestId": "optional-request-id"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Cancel request sent"
}
```

---

### Enable Auto Scan

```http
POST /api/twain/autoscan/enable
Content-Type: application/json
```

Enable auto-scan mode. The scanner watches its paper sensor and automatically captures each document as it is inserted. Images are delivered over the [auto-scan event stream](#auto-scan-events).

**Request Body:**

```json
{
  "parameters": {
    "resolution": 200,
    "colorMode": "Grayscale",
    "duplexMode": "Simplex",
    "pageSize": "Letter",
    "autoRotate": false,
    "autoDeskew": true,
    "autoCrop": true,
    "outputFormat": "png",
    "barcodeReadingEnabled": false,
    "barcodeFilterLevel": "Normal",
    "ocrEnabled": false,
    "requestTimeoutSeconds": 0,
    "transferMode": "Auto"
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Auto-scan enabled"
}
```

**Response (503):** Desktop application not connected.

---

### Disable Auto Scan

```http
POST /api/twain/autoscan/disable
```

Disable auto-scan mode.

**Response (200):**

```json
{
  "success": true,
  "message": "Auto-scan disabled"
}
```

---

### Auto Scan Events

```
GET /api/twain/autoscan/events
```

A [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) (`text/event-stream`) endpoint that pushes each document to the browser as it is scanned while auto-scan is enabled. Enable auto-scan first with the endpoint above.

**Event types:**

| Event | Data | Description |
|-------|------|-------------|
| `image` | Scanned image object (same shape as a `scan` image) | Sent once per captured document |
| `disabled` | `{ "message": "Auto-scan was disabled" }` | Auto-scan was turned off; the stream ends |
| `error` | `{ "error": "..." }` | The desktop app disconnected or another error occurred |

**Example stream:**

```
event: image
data: {"base64Data":"...","mimeType":"image/png","pageNumber":1,"width":2550,"height":3300,...}

event: disabled
data: {"message":"Auto-scan was disabled"}
```

---

### TWAIN Direct Protocol Endpoint

```http
POST /api/twain
Content-Type: application/json
```

The main TWAIN Direct protocol endpoint used by the JavaScript SDK.

**Supported Methods:**

| Method | Description |
|--------|-------------|
| `getSources` | List available scanners |
| `openSource` | Open a scanner |
| `closeSource` | Close the current scanner |
| `getCapabilities` | Get scanner capabilities |
| `getStatus` | Get scanner status |
| `scan` | Perform a scan |

**Request Format:**

```json
{
  "kind": "twainlocalscanner",
  "method": "getSources",
  "params": null
}
```

**Response Format:**

```json
{
  "kind": "twainlocalscanner",
  "commandId": "unique-id",
  "method": "getSources",
  "results": {
    "success": true,
    "code": "success"
  },
  "data": {
    "availableSources": [...]
  }
}
```

---

## Enum Values

### Color Modes

| Value | Description |
|-------|-------------|
| `Color` | Full color scan (24-bit RGB) |
| `Grayscale` | Grayscale scan (8-bit) |
| `BlackAndWhite` | Black and white scan (1-bit) |

### Duplex Modes

| Value | Description |
|-------|-------------|
| `Simplex` | Single-sided scanning |
| `DuplexLongEdge` | Double-sided, flip on long edge |
| `DuplexShortEdge` | Double-sided, flip on short edge |

### Page Sizes

| Value | Description |
|-------|-------------|
| `Letter` | 8.5" x 11" |
| `Legal` | 8.5" x 14" |
| `A4` | 210mm x 297mm |
| `A5` | 148mm x 210mm |
| `Auto` | Auto-detect page size |

### Output Formats

| Value | MIME Type |
|-------|----------|
| `png` | `image/png` |
| `jpeg` | `image/jpeg` |
| `bmp` | `image/bmp` |
| `tiff` | `image/tiff` |

### Barcode Filter Levels

| Level | Description |
|-------|-------------|
| `Low` | Minimal validation, may include false positives |
| `Normal` | Balanced validation (recommended) |
| `High` | Strict validation, fewer false positives |
| `VeryHigh` | Most strict, only high-confidence results |
