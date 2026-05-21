import http.server, webbrowser, threading, os

PORT = 8741  # pick something obscure so it doesn't clash
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def open_browser():
    webbrowser.open(f'http://localhost:{PORT}/holodeck.html')

threading.Timer(0.5, open_browser).start()
http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=PORT)
