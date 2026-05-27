import yaml
import uvicorn
from llama_cpp.server.app import create_app
from llama_cpp.server.settings import Settings, ModelSettings

with open('config.yaml') as f:
    config = yaml.safe_load(f) or {}

model_settings = [ModelSettings(
    model=config['model_path'],
    n_gpu_layers=-1,
    n_ctx=32768,
)]

settings = Settings(
    host='127.0.0.1',
    port=8081,
    api_key=config.get('password', ''),
)

app = create_app(settings=settings, model_settings=model_settings)
uvicorn.run(app, host=settings.host, port=settings.port)
