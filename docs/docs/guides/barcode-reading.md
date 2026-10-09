---
sidebar_position: 3
description: Detect and decode barcodes from scanned pages, including supported symbologies and how results are returned to the browser.
keywords: [barcode scanning, barcode decoding, document separation barcode, QR code scanner, symbologies]
---

# Barcode Reading

AmbirScan Web Connect can detect and decode barcodes from scanned images.

:::note
Barcode decoding is a premium feature that requires additional licensing. Without a license, barcode results will not be returned. [Contact Ambir for pricing](https://ambir.com/developers/).
:::

## Enabling Barcode Detection

Pass `barcodeReadingEnabled: true` in your scan parameters. If you know which barcode type
you are scanning, say so with `barcodeFormats` — it is the biggest single speed-up available:

```javascript
const images = await scanner.scan({
    resolution: 300,
    colorMode: 'Color',
    barcodeReadingEnabled: true,
    barcodeFormats: ['Pdf417']   // optional: only look for PDF417
});
```

## Choosing Symbologies

By default every supported symbology is searched on every page. Each one you don't need
costs extra decode passes, so two optional parameters let you narrow the search:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `barcodeFormats` | `string[]` | `[]` (all) | Only look for these symbologies. Use the names in the first column of [Supported Barcode Formats](#supported-barcode-formats). |
| `barcodeStopAfterFirst` | `boolean` | `false` | Stop reading a page as soon as one barcode is found |

```javascript
// Driver's licence: one PDF417 barcode per card
const images = await scanner.scan({
    barcodeReadingEnabled: true,
    barcodeFormats: ['Pdf417'],
    barcodeStopAfterFirst: true
});

// Shipping labels that carry both a QR code and a Code 128
const labels = await scanner.scan({
    barcodeReadingEnabled: true,
    barcodeFormats: ['QrCode', 'Code128']
});
```

- **Speed:** narrowing `barcodeFormats` to the one symbology you expect, or setting
  `barcodeStopAfterFirst`, can cut a driver's-licence page from over a dozen decode passes
  to one.
- **Accuracy:** restricting formats also removes false positives — for example, a plain
  page misread as a short `UPC_E` code.
- **Names** are matched case-insensitively (`'pdf417'` works). In `scan()`, names that aren't
  recognised are skipped, and if none are recognised every symbology is searched. The REST
  `/api/twain/scan` endpoint and auto-scan reject an unrecognised name with HTTP 400 instead.
- Leave `barcodeStopAfterFirst` off for pages that carry more than one barcode you need.

Both parameters are optional; omitting them keeps the previous behaviour.

:::note macOS
On macOS, `barcodeFormats` and `barcodeStopAfterFirst` are ignored — every symbology is
always searched — and the scan still succeeds. Result fields and `barcodeType` names are the same as on Windows,
except that `UPC_A` is never reported. See
[Platform Differences](../sdk-reference.md#platform-differences).
:::

## Reading Barcode Results

Each scanned image includes a `barcodes` array:

```javascript
images.forEach(image => {
    if (image.barcodes && image.barcodes.length > 0) {
        image.barcodes.forEach(barcode => {
            console.log(`Type: ${barcode.barcodeType}`);
            console.log(`Text: ${barcode.text}`);
            console.log(`Confidence: ${(barcode.confidence * 100).toFixed(0)}%`);

            // AAMVA driver's license data (if applicable)
            if (barcode.isAamva && barcode.parsedData) {
                console.log(`Driver License Data: ${barcode.parsedData}`);
            }
        });
    }
});
```

## Supported Barcode Formats

Thirteen symbologies are supported. Request them by the name in the first column; results
report them by the name in the second column.

| `barcodeFormats` name | Result `barcodeType` | Kind | Typical use |
|-----------------------|----------------------|------|-------------|
| `Pdf417` | `PDF_417` | 2D | Driver's licences and ID cards, shipping labels |
| `QrCode` | `QR_CODE` | 2D | URLs, tickets, general-purpose data |
| `DataMatrix` | `DATA_MATRIX` | 2D | Small parts marking, pharmaceuticals |
| `Aztec` | `AZTEC` | 2D | Boarding passes, transit tickets |
| `Code128` | `CODE_128` | 1D | High-density alphanumeric, shipping and logistics |
| `Code39` | `CODE_39` | 1D | Alphanumeric, industrial and government |
| `Code93` | `CODE_93` | 1D | Compact alphanumeric |
| `Ean13` | `EAN_13` | 1D | Retail products (13-digit) |
| `Ean8` | `EAN_8` | 1D | Retail products (8-digit) |
| `UpcA` | `UPC_A` | 1D | Retail products (12-digit) |
| `UpcE` | `UPC_E` | 1D | Compressed UPC |
| `Itf` | `ITF` | 1D | Interleaved 2 of 5, cartons |
| `Codabar` | `CODABAR` | 1D | Libraries, blood banks |

## AAMVA Driver's License Decoding

AmbirScan Web Connect includes built-in AAMVA (American Association of Motor Vehicle Administrators) decoding for North American driver's licenses and identification cards. When a PDF_417 barcode from a driver's license is detected, the barcode result includes parsed AAMVA data.

### How It Works

The PDF_417 barcode on the back of North American driver's licenses encodes personal and license data in the AAMVA standard format. AmbirScan Web Connect automatically detects AAMVA-encoded barcodes and parses the structured data.

### Barcode Result Fields

When an AAMVA barcode is detected, the barcode object includes additional fields:

| Field | Type | Description |
|-------|------|-------------|
| `isAamva` | `boolean` | `true` if the barcode contains AAMVA-encoded data |
| `parsedData` | `string` | Parsed AAMVA data from the driver's license |

### Example

```javascript
const images = await scanner.scan({
    resolution: 300,
    colorMode: 'Color',
    barcodeReadingEnabled: true,
    barcodeFormats: ['Pdf417']
});

images.forEach(image => {
    image.barcodes?.forEach(barcode => {
        if (barcode.isAamva && barcode.parsedData) {
            console.log('Driver License Data:', barcode.parsedData);
        }
    });
});
```

:::tip
For best results scanning driver's licenses, use 300 DPI, Color mode and
`barcodeFormats: ['Pdf417']`. The PDF_417 barcode on the back of the license is typically
small and dense, and limiting the search to PDF417 is both faster and more reliable than
searching every symbology.
:::

## Filter Levels

The `barcodeFilterLevel` parameter controls how aggressively false positives are filtered:

| Level | Description | Use Case |
|-------|-------------|----------|
| `Low` | Minimal validation, may include false positives | When you need to catch every possible barcode |
| `Normal` | Balanced validation (recommended) | General use |
| `High` | Strict validation, fewer false positives | When accuracy is more important than recall |
| `VeryHigh` | Most strict, only high-confidence results | When you need maximum certainty |

Windows and macOS apply these levels with different thresholds, so the same level can
return slightly different results on each. On macOS, `VeryHigh` also discards barcodes
shorter than six characters. Use the level names exactly as shown.

## Best Practices

- **Resolution:** Use 300 DPI for best barcode detection. Lower resolutions may miss small barcodes.
- **Color mode:** Grayscale or Color both work well. Black & White may lose detail on damaged barcodes.
- **Multiple barcodes:** All barcodes on a page are detected in a single scan — no need to scan multiple times. Leave `barcodeStopAfterFirst` off in this case.
- **Performance:** Barcode detection adds processing time. Only enable it when needed, and pass `barcodeFormats` whenever you know what you are scanning.
