#!/usr/bin/env python3
"""Accents for UI5 development server: serves the repository with caching switched off, so an edited
module is always the one the browser runs.

    python3 tools/serve.py [port]      (default 8811)
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8811
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"Accents gallery: http://127.0.0.1:{port}/gallery/index.html")
    ThreadingHTTPServer(("127.0.0.1", port), partial(NoCache, directory=root)).serve_forever()
