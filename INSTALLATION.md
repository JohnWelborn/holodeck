# Local LLM Setup with llama.cpp

Two options for running the model backend:

- **Option A: llama-server** — pre-built binary, works on Windows/Mac/Linux
- **Option B: backend.py** — Python server via llama-cpp-python, for WSL2 + CUDA (RTX 5090)

---

## Download the model

```bash
curl -L -o Mistral-Small-24B-Instruct-2501-Q8_0.gguf \
  "https://huggingface.co/bartowski/Mistral-Small-24B-Instruct-2501-GGUF/resolve/main/Mistral-Small-24B-Instruct-2501-Q8_0.gguf"
```

---

## Option A: llama-server

Download a pre-built release from the [llama.cpp releases page](https://github.com/ggml-org/llama.cpp/releases).

For Windows with an NVIDIA GPU, download both of these from the same release and extract them into the same folder:

- `llama-b9351-bin-win-cuda-13.1-x64.zip` — the server binary
- `cudart-llama-bin-win-cuda-13.1-x64.zip` — the CUDA runtime DLLs (required for GPU support)

The CUDA runtime DLLs must be in the same directory as the executable. You can verify GPU detection with:

```
llama-server.exe --list-devices
```

Run `llama-server` (or `llama-server.exe` on Windows) from the extracted directory:

```bash
./llama-server \
  --model Mistral-Small-24B-Instruct-2501-Q8_0.gguf \
  --host 127.0.0.1 \
  --port 8081 \
  --ctx-size 32768 \
  --n-gpu-layers 99 \
  --api-key my-secret-token
```

| Flag | Description |
|------|-------------|
| `--ctx-size 32768` | Context window (32k, matches model max) |
| `--n-gpu-layers 99` | Offload all layers to GPU; set to `0` for CPU-only |
| `--api-key` | Bearer token required on all requests |
| `--parallel` | Number of simultaneous request slots (default: 1) |

---

## Option B: backend.py (WSL2 + Ubuntu 24.04 + RTX 5090)

### 1. Verify GPU passthrough

```bash
nvidia-smi
```

### 2. Install dependencies

```bash
sudo apt install build-essential python3-dev libssl-dev autoconf
```

### 3. Install CUDA toolkit

Ubuntu's default apt version doesn't support Blackwell — use NVIDIA's official repo:

```bash
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update
sudo apt install cuda-toolkit-13-2
```

Add to `~/.bash_aliases`:

```bash
export PATH=/usr/local/cuda/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
```

Verify:

```bash
nvcc --version
```

### 4. Install uv

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 5. Install Python dependencies

```bash
CMAKE_ARGS="-DGGML_CUDA=on" uv sync --extra backend --no-binary llama-cpp-python
```

### 6. Run the backend

```bash
uv run python backend.py
```

---

## Configure Holodeck

Copy the example config if you haven't already:

```bash
cp config.example.yaml config.yaml
```

Edit `config.yaml`:

```yaml
ui_port: 8080
model_url: http://127.0.0.1:8081/v1
model: mistral-small-24b-instruct-2501
model_path: /mnt/c/Users/.../models/Mistral-Small-24B-Instruct-2501-Q8_0.gguf  # Option B only
password: my-secret-token
censor: true
```

`model_path` is only used by `backend.py` (Option B). The `model` value can be any string — the server ignores it and uses whatever was loaded at startup.

---

## Launch Holodeck

```bash
uv sync
uv run python launch.py
```

Open `http://localhost:8080` in your browser.

---

## Troubleshooting

**Out of memory:** Reduce `--ctx-size` (try `8192`) or lower `--n-gpu-layers` to partially offload.

**Slow responses:** Mistral-Small-24B is ~14 GB. On CPU it generates ~1–3 tokens/sec. A GPU with 16+ GB VRAM runs at full speed.

**"Unauthorized" errors:** Make sure the `password` in `config.yaml` exactly matches the `--api-key` (Option A) or is set in `config.yaml` (Option B).

**Port conflict:** Holodeck defaults to port `8080`; this guide uses `8081` for the backend to avoid the conflict. Adjust either port as needed.

**WSL2 — nvcc not found after install:** Add the CUDA bin path to `~/.bash_aliases` and reload your shell.
