#!/usr/bin/env python3
"""index.html'i hem normal önizleme hem de zorunlu indirme olarak sunar."""
import http.server
import socketserver

PORT = 8438
FILE = "index.html"

class Handler(http.server.SimpleHTTPRequestHandler):
    def _indir(self):
        try:
            with open(FILE, "rb") as f:
                data = f.read()
        except OSError:
            self.send_error(404)
            return None
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Disposition", 'attachment; filename="filo-paneli.html"')
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        return data

    DOWNLOAD_PATHS = {"/indir", "/yedek", "/dosya-indir", "/son-surum"}

    def do_GET(self):
        p = self.path.split("?")[0].rstrip("/") or "/"
        if p in self.DOWNLOAD_PATHS:
            data = self._indir()
            if data:
                self.wfile.write(data)
        else:
            super().do_GET()

    def do_HEAD(self):
        p = self.path.split("?")[0].rstrip("/") or "/"
        if p in self.DOWNLOAD_PATHS:
            self._indir()
        else:
            super().do_HEAD()

class ReuseTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True

with ReuseTCPServer(("0.0.0.0", PORT), Handler) as httpd:
    httpd.serve_forever()
