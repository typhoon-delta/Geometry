"""Máy chủ nhỏ (chỉ trên máy mình, 127.0.0.1) để xem báo cáo và ghi phản hồi "hay"/"chán" thẳng vào tệp.

Phục vụ cả thư mục gốc của repo, nên link "Mở bản trên máy" (../../index.html#h=…) mở công cụ web ngay trên máy.
"""

from __future__ import annotations

import functools
import http.server
import json
import socketserver
import threading
import webbrowser

from .config import ROOT
from .feedback import save_feedback_entry


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):  # yên lặng
        pass

    def do_POST(self):
        if self.path != "/api/phan-hoi":
            self.send_error(404)
            return
        try:
            n = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(n).decode("utf-8"))
            key = str(data.pop("key"))
            save_feedback_entry(key, data)
        except Exception as e:  # noqa: BLE001
            self.send_error(400, str(e))
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def serve(rel_path: str, port: int = 8765, open_browser: bool = True, block: bool = True):
    handler = functools.partial(Handler, directory=ROOT)
    for p in range(port, port + 20):
        try:
            srv = Server(("127.0.0.1", p), handler)
            break
        except OSError:
            continue
    else:
        raise OSError("không mở được cổng nào cho máy chủ báo cáo")
    url = f"http://127.0.0.1:{srv.server_address[1]}/{rel_path.replace(chr(92), '/')}"
    if not block:
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        return srv, url
    print(f"Báo cáo: {url}\n(Để cửa sổ này mở trong khi xem; bấm Ctrl+C để tắt.)")
    if open_browser:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("Đã tắt máy chủ báo cáo.")
    finally:
        srv.server_close()
    return srv, url
