---
sidebar_position: 9
description: Diagnose AmbirScan Web Connect on macOS — check and restart the background service, find the logs, and fix common certificate and scanner problems.
keywords: [macOS scanner troubleshooting, launchctl scanner service, Mac scanner logs, localhost 53052 macOS, Image Capture scanner]
---

# macOS Diagnostics

On macOS, AmbirScan Web Connect runs as one background service (a per-user LaunchAgent)
that both talks to the scanner and serves the HTTPS API on `https://localhost:53052`. This
guide covers checking that service, reading its logs and fixing the problems most often seen.

## Is the Service Running?

```bash
curl -sk https://localhost:53052/api/twain/status
```

A JSON response with `"serviceOnline": true` means the service is up. If the command fails
to connect, check whether macOS has the service loaded:

```bash
launchctl print gui/$(id -u)/com.ambir.aswcn.scannerbridge
```

If that reports the service is not found, load it again:

```bash
"/Library/Application Support/Ambir/ScannerBridge/install-agent.sh"
```

## Restarting, Stopping and Starting

```bash
# Restart
launchctl kickstart -k gui/$(id -u)/com.ambir.aswcn.scannerbridge

# Stop (stays stopped until you start it again or log in again)
kill -TERM $(lsof -ti tcp:53052 -sTCP:LISTEN)

# Start again after a stop
launchctl kickstart gui/$(id -u)/com.ambir.aswcn.scannerbridge
```

:::note
`launchctl stop` does not stop this service. Use the `kill -TERM` command above instead.
:::

## Log Files

| Log | Location |
|-----|----------|
| Service log | `~/Library/Logs/ASWCN/ScannerBridge/daemon-*.log` |
| Service startup errors | `~/Library/Logs/ASWCN/ScannerBridge/launchd-stderr.log` |
| Ambir scanner driver log | `~/Library/Application Support/AmbirTechnology/AmbirICA.log` |
| Installer log | `/var/log/install.log` — search for `ASWCN postinstall` |

## Common Problems

### `http://localhost:53052` is refused

The service uses HTTPS. Use `https://localhost:53052`.

If the opposite happens — `http://localhost:53052` answers but `https://` does not — the
service could not find its certificate and has fallen back to plain HTTP, which browsers will
not use. Set up the certificate as described in the next section.

### The browser cannot connect, or reports the connection is not secure

The HTTPS certificate is missing or not trusted for the current user. This happens when the
package was installed while a different user was logged in, while nobody was logged in, or
when the certificate command was run with `sudo`. Check for the certificate:

```bash
security find-certificate -c "ASWCN Scanner Bridge" ~/Library/Keychains/login.keychain-db
```

If nothing is found, set it up for your account as described in
[Multiple Users and Managed Installs](./macos-installer.md#multiple-users-and-managed-installs),
then restart the service. Firefox users also need the
[Firefox setting](./browser-security.md#firefox).

### No scanners are listed

1. Make sure the scanner is connected, powered on, and its macOS ICA driver is installed. For Ambir scanners, that is the [Ambir ICA Driver](https://ambirfileshare.s3.us-west-2.amazonaws.com/AmbirIcaDriver.1.2.52.pkg).
2. Open Apple's **Image Capture** app. If Image Capture cannot see the scanner, the problem
   is the driver or the connection rather than AmbirScan Web Connect.
3. Quit Image Capture (and Preview) before scanning from the browser — only one app at a
   time can use a scanner on macOS.
4. Scanners from manufacturers other than Ambir are listed only when a
   [third-party scanner license](../introduction.md#third-party-scanner-support) is active.
   Check the license status on the [admin page](./macos-installer.md#licensing-and-settings).

### Another app cannot see the scanner

While a web page has the scanner open, the service holds it and other apps cannot use it.
Have the page call `closeSource()`, or release the scanner from Terminal without stopping
anything:

```bash
curl -sk -X POST https://localhost:53052/api/twain \
  -H 'Content-Type: application/json' \
  -d '{"kind":"twainlocalscanner","method":"closeSource"}'
```

### Auto-scan ignores a setting changed after it started

Auto-scan captures its scan options when it is enabled. To change them, call
`disableAutoScan()` and then `enableAutoScan()` with the new options.

### The service is not running after installation

Check `~/Library/Logs/ASWCN/ScannerBridge/launchd-stderr.log` and `/var/log/install.log`.
If the installer could not start the service, it starts at your next login; to start it
immediately, run `install-agent.sh` as shown [above](#is-the-service-running).
