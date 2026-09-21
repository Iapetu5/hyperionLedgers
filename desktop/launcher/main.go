// HyperionInvoices Windows launcher — opens the live bookkeeping app.
package main

import (
	"os/exec"
)

func main() {
	url := "https://www.hyperioninvoices.com.au"
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}
