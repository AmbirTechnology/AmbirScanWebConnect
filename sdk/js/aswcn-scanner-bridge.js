// Copyright (c) 2026 Ambir Technology, Inc.
// Licensed under the MIT License. See LICENSE file in the project root.

/**
 * ASWCN Scanner Bridge - TWAIN Direct JavaScript Client
 * Provides interface to communicate with local scanner via Windows Service
 */

class ASWCNScannerBridge {
    constructor(baseUrl = null) {
        this.baseUrl = baseUrl; // Will be set from config if null
        this.twainEndpoint = null; // Will be set after initialization
        this.initialized = false;
    }

    /**
     * Initialize the scanner bridge by fetching configuration
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;

        // If baseUrl was provided in constructor, use it
        if (this.baseUrl) {
            this.twainEndpoint = `${this.baseUrl}/api/twain`;
            this.initialized = true;
            return;
        }

        // Otherwise, fetch from config endpoint
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                // Use configured URL, or fallback to default port 53052
                this.baseUrl = config.scannerServiceUrl || 'https://localhost:53052';
            } else {
                // Fallback to default if config endpoint not available
                console.warn('Config endpoint not available, using default port 53052');
                this.baseUrl = 'https://localhost:53052';
            }
        } catch (error) {
            // Fallback to default if config fetch fails
            console.warn('Failed to fetch config, using default port 53052:', error);
            this.baseUrl = 'https://localhost:53052';
        }

        this.twainEndpoint = `${this.baseUrl}/api/twain`;
        this.initialized = true;
    }

    /**
     * Ensure the bridge is initialized before making requests
     * @private
     */
    async _ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    /**
     * Send TWAIN Direct command to scanner
     * @param {string} method - TWAIN Direct method name
     * @param {object} params - Optional parameters
     * @returns {Promise<object>} Response from scanner
     */
    async sendCommand(method, params = null) {
        await this._ensureInitialized();
        
        try {
            const response = await fetch(this.twainEndpoint, {
                method: 'POST',
                mode: 'cors', // Enable CORS
                credentials: 'include', // Include credentials for CORS
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kind: 'twainlocalscanner',
                    method: method,
                    params: params
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Scanner communication error:', error);
            throw error;
        }
    }

    /**
     * Unwrap the data payload from a TWAIN Direct response.
     *
     * Handler-level failures (e.g. desktop app disconnected, pipe timeout)
     * come back as HTTP 200 with a results object ({ success: false, code })
     * and NO data payload. Blindly reading response.data.* in that case throws
     * a cryptic "cannot read properties of undefined" error. This surfaces the
     * real reason instead.
     *
     * @private
     * @param {object} response - Parsed TWAIN Direct response
     * @returns {object} The data payload (guaranteed non-null)
     */
    _unwrapData(response) {
        if (response?.results && response.results.success === false) {
            const msg = response.data?.message
                || response.results.code
                || 'The scanner service returned an error';
            throw new Error(msg);
        }
        if (!response || !response.data) {
            throw new Error('No data returned from the scanner service. '
                + 'The desktop application may be disconnected or the request timed out.');
        }
        return response.data;
    }

    /**
     * Get list of available scanners
     * @returns {Promise<string[]>} List of scanner names
     */
    async getSources() {
        const response = await this.sendCommand('getSources');
        return this._unwrapData(response).availableSources || [];
    }

    /**
     * Open a scanner source
     * @param {string} sourceName - Name of the scanner to open
     * @returns {Promise<object>} Response
     */
    async openSource(sourceName) {
        return await this.sendCommand('openSource', { sourceName });
    }

    /**
     * Close the current scanner source
     * @returns {Promise<object>} Response
     */
    async closeSource() {
        return await this.sendCommand('closeSource');
    }

    /**
     * Get scanner capabilities
     * @param {string} sourceName - Name of the scanner
     * @returns {Promise<object>} Scanner capabilities
     */
    async getCapabilities(sourceName) {
        const response = await this.sendCommand('getCapabilities', { sourceName });
        return this._unwrapData(response).capabilities;
    }

    /**
     * Get scanner status
     * @returns {Promise<object>} Scanner status
     */
    async getStatus() {
        const response = await this.sendCommand('getStatus');
        return this._unwrapData(response).scannerStatus;
    }

    /**
     * Check if paper is loaded in scanner feeder
     * @returns {Promise<boolean>} True if paper is loaded
     */
    async checkPaperLoaded() {
        const status = await this.getStatus();
        return status.isPaperLoaded;
    }

    /**
     * Check if scanner is online
     * @returns {Promise<boolean>} True if scanner is online
     */
    async checkScannerOnline() {
        const status = await this.getStatus();
        return status.isOnline;
    }

    /**
     * Perform scan with specified parameters
     * @param {object} scanParams - Scan parameters
     * @param {number} scanParams.resolution - DPI (e.g., 300)
     * @param {string} scanParams.colorMode - 'Color', 'Grayscale', or 'BlackAndWhite'
     * @param {string} scanParams.duplexMode - 'Simplex', 'DuplexLongEdge', or 'DuplexShortEdge'
     * @param {string} scanParams.pageSize - 'Letter', 'Legal', 'A4', etc.
     * @param {boolean} scanParams.autoRotate - Enable auto-rotation
     * @param {boolean} scanParams.autoDeskew - Enable auto-deskew
     * @param {boolean} scanParams.autoCrop - Enable auto-crop
     * @param {string} [scanParams.transferMode] - TWAIN transfer mode: 'Auto', 'Native' or
     *        'Buffered'. Omit to use the mode configured in the desktop app, which defaults to
     *        native. Buffered transfer returns malformed images on several scanner models
     *        (shearing, colour fringing, blank pages), so only set 'Buffered' if a scanner
     *        specifically requires it. Installs older than this option ignore it.
     * @returns {Promise<object[]>} Array of scanned images
     */
    async scan(scanParams = {}) {
        const defaultParams = {
            resolution: 200,
            colorMode: 'Grayscale',
            duplexMode: 'Simplex',
            pageSize: 'Letter',
            autoRotate: false,
            autoDeskew: true,
            autoCrop: true,
            outputFormat: 'png',
            barcodeReadingEnabled: false,
            barcodeFilterLevel: 'Normal',
            requestTimeoutSeconds: 0,
            ocrEnabled: false
        };

        const params = { ...defaultParams, ...scanParams };
        const response = await this.sendCommand('scan', params);
        
        // Check TWAIN Direct response format
        if (response.results && response.results.success) {
            return response.data.images;
        } else {
            const errorMsg = response.data?.message || response.results?.code || 'Scan failed';
            throw new Error(errorMsg);
        }
    }

    /**
     * Check if the scanner service is available
     * @returns {Promise<boolean>} True if service is available
     */
    async checkServiceStatus() {
        await this._ensureInitialized();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/twain/status`, {
                mode: 'cors',
                credentials: 'include'
            });
            if (!response.ok) return false;
            
            const data = await response.json();
            return data.serviceOnline && data.desktopAppConnected;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the installed AmbirScan Web Connect version.
     * Returns the Service version (always available) and the Desktop version
     * (only when the desktop app is connected).
     *
     * A 404 indicates a legacy client installed before the version endpoint
     * existed; in that case { legacy: true } is returned.
     *
     * @returns {Promise<object>} { productName, serviceVersion, desktopVersion, desktopAppConnected, legacy }
     */
    async getVersion() {
        await this._ensureInitialized();

        try {
            const response = await fetch(`${this.baseUrl}/api/twain/version`, {
                mode: 'cors',
                credentials: 'include'
            });

            if (response.status === 404) {
                // Endpoint doesn't exist on clients installed before this version
                return { legacy: true };
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                productName: data.productName,
                serviceVersion: data.serviceVersion,
                desktopVersion: data.desktopVersion,
                desktopAppConnected: data.desktopAppConnected,
                legacy: false
            };
        } catch (error) {
            console.error('Version query error:', error);
            throw error;
        }
    }

    /**
     * Enable auto-scan mode. The scanner watches its paper sensor and
     * automatically captures each document as it is inserted, without a
     * separate scan() call per page. Captured images are delivered through
     * the auto-scan event stream (see startAutoScan).
     *
     * @param {object} scanParams - Same parameters accepted by scan()
     * @returns {Promise<object>} { success, message }
     */
    async enableAutoScan(scanParams = {}) {
        await this._ensureInitialized();

        const defaultParams = {
            resolution: 200,
            colorMode: 'Grayscale',
            duplexMode: 'Simplex',
            pageSize: 'Letter',
            autoRotate: false,
            autoDeskew: true,
            autoCrop: true,
            outputFormat: 'png',
            barcodeReadingEnabled: false,
            barcodeFilterLevel: 'Normal',
            requestTimeoutSeconds: 0,
            ocrEnabled: false
        };

        const params = { ...defaultParams, ...scanParams };

        const response = await fetch(`${this.baseUrl}/api/twain/autoscan/enable`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parameters: params })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Disable auto-scan mode.
     * @returns {Promise<object>} { success, message }
     */
    async disableAutoScan() {
        await this._ensureInitialized();

        const response = await fetch(`${this.baseUrl}/api/twain/autoscan/disable`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Open the auto-scan event stream (Server-Sent Events). Each document
     * scanned while auto-scan is enabled is delivered to onImage as it is
     * captured. Call enableAutoScan() first.
     *
     * Returns the underlying EventSource; call its .close() method, or
     * stopAutoScan(source), to stop listening.
     *
     * @param {object} handlers
     * @param {function} handlers.onImage - Called with each scanned image object
     * @param {function} [handlers.onDisabled] - Called when auto-scan is turned off
     * @param {function} [handlers.onError] - Called on stream error (payload may be null on connection drop)
     * @returns {Promise<EventSource>}
     */
    async startAutoScan({ onImage, onDisabled, onError } = {}) {
        await this._ensureInitialized();

        const source = new EventSource(`${this.baseUrl}/api/twain/autoscan/events`, {
            withCredentials: true
        });

        source.addEventListener('image', (e) => {
            if (onImage) onImage(JSON.parse(e.data));
        });

        source.addEventListener('disabled', (e) => {
            let payload = null;
            try { payload = e.data ? JSON.parse(e.data) : null; } catch { /* ignore */ }
            if (onDisabled) onDisabled(payload);
            source.close();
        });

        source.addEventListener('error', (e) => {
            let payload = null;
            try { payload = e.data ? JSON.parse(e.data) : null; } catch { /* connection error, no data */ }
            if (onError) onError(payload);
        });

        return source;
    }

    /**
     * Stop an auto-scan event stream previously started with startAutoScan().
     * @param {EventSource} source
     */
    stopAutoScan(source) {
        if (source) source.close();
    }
}

// Example usage:
/*
const scanner = new ASWCNScannerBridge();

// Check if service is available
const isAvailable = await scanner.checkServiceStatus();
if (!isAvailable) {
    console.error('Scanner service not available');
    return;
}

// Check which version is installed on the client
const version = await scanner.getVersion();
if (version.legacy) {
    console.warn('Legacy client installed - update recommended');
} else {
    console.log('Service version:', version.serviceVersion);
    console.log('Desktop version:', version.desktopVersion);
}

// Get available scanners
const sources = await scanner.getSources();
console.log('Available scanners:', sources);

// Open scanner
await scanner.openSource(sources[0]);

// Get capabilities
const capabilities = await scanner.getCapabilities(sources[0]);
console.log('Scanner capabilities:', capabilities);

// Scan with custom parameters
const images = await scanner.scan({
    resolution: 300,
    colorMode: 'Color',
    duplexMode: 'Simplex',
    autoRotate: true,
    autoDeskew: true
});

console.log('Scanned images:', images);

// Close scanner
await scanner.closeSource();
*/
