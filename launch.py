import http.server, webbrowser, threading, os, json, yaml

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

config = {}
if os.path.exists('config.yaml'):
    with open('config.yaml') as f:
        config = yaml.safe_load(f) or {}

PORT = config.get('port', PORT)


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/', '/holodeck.html'):
            self._serve_patched_html()
        else:
            super().do_GET()

    def _serve_patched_html(self):
        with open('holodeck.html', 'rb') as f:
            content = f.read().decode('utf-8')

        overrides = {k: v for k, v in {
            'baseUrl': config.get('base_url'),
            'model':   config.get('model'),
            'token':   config.get('password'),
        }.items() if v is not None}

        if overrides:
            lines = []
            if 'baseUrl' in overrides:
                lines.append(f"  apiSettings.baseUrl = {json.dumps(overrides['baseUrl'])}; document.getElementById('api-url').value = apiSettings.baseUrl;")
            if 'model' in overrides:
                lines.append(f"  apiSettings.model = {json.dumps(overrides['model'])}; document.getElementById('api-model').value = apiSettings.model;")
            if 'token' in overrides:
                lines.append(f"  apiSettings.token = {json.dumps(overrides['token'])}; document.getElementById('api-token').value = apiSettings.token;")
            inject = '<script>\n' + '\n'.join(lines) + '\n</script>\n'
            content = content.replace('</body>', inject + '</body>', 1)

        encoded = content.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', len(encoded))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format, *args):
        pass


def open_browser():
    webbrowser.open(f'http://localhost:{PORT}/holodeck.html')


threading.Timer(0.5, open_browser).start()
http.server.test(HandlerClass=Handler, port=PORT)
