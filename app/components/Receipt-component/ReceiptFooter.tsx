import React from 'react'

function ReceiptFooter() {
  return (
    <footer className="border-t border-border py-8">
          <div className="container text-center">
            <p className="text-sm text-muted-foreground">
              Powered by{" "}
              <a
                href="https://zidwell.com"
                className="font-semibold text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Zidwell Finance
              </a>{" "}
              — Financial tools for Nigerian entrepreneurs.
            </p>
          </div>
        </footer>
  )
}

export default ReceiptFooter