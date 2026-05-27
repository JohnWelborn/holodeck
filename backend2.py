import json
import yaml
import uvicorn
from urllib.parse import urlparse
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from llama_cpp import Llama

with open('config.yaml') as f:
    config = yaml.safe_load(f) or {}

parsed = urlparse(config['model_url'])

llm = Llama(
    model_path=config['model_path'],
    n_gpu_layers=-1,
    n_ctx=32768,
)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

@app.post('/v1/chat/completions')
async def chat_completions(request: Request):
    body = await request.json()
    stream = body.get('stream', False)

    kwargs = {k: body[k] for k in (
        'messages', 'model', 'max_tokens', 'temperature', 'top_p', 'top_k',
        'stop', 'stream', 'presence_penalty', 'frequency_penalty',
        'repeat_penalty', 'seed', 'response_format', 'logit_bias',
    ) if k in body}

    if stream:
        def generate():
            for chunk in llm.create_chat_completion(**kwargs):
                yield f'data: {json.dumps(chunk)}\n\n'
            yield 'data: [DONE]\n\n'
        return StreamingResponse(generate(), media_type='text/event-stream')

    return JSONResponse(llm.create_chat_completion(**kwargs))

uvicorn.run(app, host=parsed.hostname, port=parsed.port)
