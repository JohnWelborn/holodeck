import yaml
import uvicorn
from urllib.parse import urlparse
from llama_cpp.server.app import create_app
from llama_cpp.server.settings import Settings, ModelSettings

with open('config.yaml') as f:
    config = yaml.safe_load(f) or {}

parsed = urlparse(config['model_url'])

model_settings = [ModelSettings(
    model=config['model_path'],
    n_gpu_layers=-1,
    n_ctx=32768,
)]

settings = Settings(
    host=parsed.hostname,
    port=parsed.port,
    api_key=config.get('password', ''),
)

app = create_app(settings=settings, model_settings=model_settings)
uvicorn.run(app, host=settings.host, port=settings.port)
