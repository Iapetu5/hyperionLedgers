# HyperionInvoices desktop

The Windows download served to paying customers is a small launcher (`.exe`) that opens [https://www.hyperioninvoices.com.au](https://www.hyperioninvoices.com.au).

## Build the Windows launcher (from Linux or macOS)

```bash
cd desktop/launcher
go mod tidy
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o ../../private/downloads/HyperionInvoices-Setup.exe
```

The file lives in `private/downloads/` — **not** `public/`. Only `/api/downloads/windows` may stream it after a verified Stripe subscription or signed-in entitlement.

## Later: full Electron/Tauri shell

Use this folder for a packaged desktop shell when you want an offline window. Until then the Go launcher is the shippable Windows binary.

Mac is coming soon.
