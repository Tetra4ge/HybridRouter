import React from 'react'

export default function Footer() {
  return (
    <footer className="dashboard-footer">
      <div className="footer-content">
        <p className="footer-copyright">
          &copy; {new Date().getFullYear()} <strong>HybridRouter</strong>. All rights reserved.
        </p>
        <p className="footer-hackathon">
          Built for the <strong>AMD Developer Hackathon 2026</strong> - Track 1
        </p>
      </div>
    </footer>
  )
}
