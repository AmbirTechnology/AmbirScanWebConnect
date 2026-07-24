---
sidebar_position: 3
---

# Barcode Reading

AmbirScan Web Connect can detect and decode barcodes from scanned images.

:::note
Barcode decoding is a premium feature that requires additional licensing. Without a license, barcode results will not be returned. [Contact Ambir for pricing](https://ambir.com/developers/).
:::

## Enabling Barcode Detection

Pass `barcodeReadingEnabled: true` in your scan parameters:

```javascript
const images = await scanner.scan({
    resolution: 300,
    colorMode: 'Color',
    barcodeReadingEnabled: true,
    barcodeFilterLevel: 'Normal'
});
```

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

The following barcode formats are detected:

### 1D Barcodes

| Format | Description |
|--------|-------------|
| CODE_128 | High-density linear barcode |
| CODE_39 | Alphanumeric barcode |
| CODE_93 | Compact alphanumeric barcode |
| EAN_13 | European Article Number (13-digit) |
| EAN_8 | European Article Number (8-digit) |
| UPC_A | Universal Product Code (12-digit) |
| UPC_E | Compressed UPC |
| ITF | Interleaved 2 of 5 |
| CODABAR | Numeric barcode used in libraries and blood banks |
| RSS_14 | GS1 DataBar (formerly RSS-14) |
| RSS_EXPANDED | GS1 DataBar Expanded |

### 2D Barcodes

| Format | Description |
|--------|-------------|
| PDF_417 | High-capacity 2D barcode (used on driver's licenses, shipping labels) |
| QR_CODE | Quick Response code |
| DATA_MATRIX | Compact 2D barcode |
| AZTEC | Used on boarding passes and transit tickets |
| MAXICODE | Fixed-size 2D barcode (used by UPS for package tracking) |

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
    barcodeFilterLevel: 'Normal'
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
For best results scanning driver's licenses, use 300 DPI and Color mode. The PDF_417 barcode on the back of the license is typically small and dense.
:::

## Filter Levels

The `barcodeFilterLevel` parameter controls how aggressively false positives are filtered:

| Level | Description | Use Case |
|-------|-------------|----------|
| `Low` | Minimal validation, may include false positives | When you need to catch every possible barcode |
| `Normal` | Balanced validation (recommended) | General use |
| `High` | Strict validation, fewer false positives | When accuracy is more important than recall |
| `VeryHigh` | Most strict, only high-confidence results | When you need maximum certainty |

## Best Practices

- **Resolution:** Use 300 DPI for best barcode detection. Lower resolutions may miss small barcodes.
- **Color mode:** Grayscale or Color both work well. Black & White may lose detail on damaged barcodes.
- **Multiple barcodes:** The scanner detects all barcodes on a page in a single scan — no need to scan multiple times.
- **Performance:** Barcode detection adds processing time (typically 2-5 seconds). Only enable it when needed.
