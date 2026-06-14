# Holodeck

A local browser-based interactive fiction engine for simulating multi-character scenes, where each AI character operates from its own filtered context and subjective view of the cast. Works with any OpenAI-compatible API, including a local llama.cpp server.

![Holodeck screenshot](screenshot.png)

## Features

Each character makes its own LLM call against a filtered transcript; characters only see what they should know, giving each one a genuinely subjective view of events.

- **Local and offline capable**: runs entirely in your browser against your own llama.cpp server, or any OpenAI-compatible API you configure
- **localStorage**: all data is stored in your browser's local storage — no server, no account
- **Programs**: named scenes with participants, environments, and scenarios; AI generation from a premise
- **Presence toggling**: characters enter and leave the scene; their context is filtered from future prompts
- **Generation variants**: regenerate or edit any message and navigate between versions
- **Fork**: branch the scene at any message into an independent copy
- **Auto-play**: AI picks who speaks next, or every present character takes a turn
- **Choose your own adventure**: three parallel response options to pick from
- **Per-program prompt control**: system prompt, closing instruction, and content policy per scene
- **Mobile-friendly layout**: designed to work on phones
- **Character card import**: drag-and-drop or file-pick a SillyTavern V2 (or V1) character card PNG to pre-fill the participant form with name, personality, speech style, photo, and tags

## Disclaimer

This repository was built as an exercise in AI-assisted coding.

## Setup

### Model

Designed for use with a Mistral Small 3.x 24B model using the Mistral v7 chat template. Connect via any OpenAI-compatible API, local or remote

- [unsloth/Mistral-Small-3.1-24B-Instruct-2503-GGUF](https://huggingface.co/unsloth/Mistral-Small-3.1-24B-Instruct-2503-GGUF)
- [bartowski/TheDrummer_Cydonia-24B-v4.2.0-GGUF](https://huggingface.co/bartowski/TheDrummer_Cydonia-24B-v4.2.0-GGUF)

Any OpenAI-compatible endpoint works. Base URL, model name, and API token are all configurable at runtime.

| GPU | VRAM | Recommended quantization |
|-----|------|--------------------------|
| RTX 5090 | 32 GB | Q8_0 |

### Start model with llama-server

Download a pre-built release from the [llama.cpp releases page](https://github.com/ggml-org/llama.cpp/releases).

For Windows with an NVIDIA GPU, download both of these from the same release and extract them into the same folder:

- `llama-b9351-bin-win-cuda-13.1-x64.zip` = the server binary
- `cudart-llama-bin-win-cuda-13.1-x64.zip` = the CUDA runtime DLLs (required for GPU support)

The CUDA runtime DLLs must be in the same directory as the executable. You can verify GPU detection with:

```
llama-server.exe --list-devices
```

Run `llama-server.exe` from the extracted directory:

```bash
./llama-server.exe \
  --model TheDrummer_Cydonia-24B-v4.2.0-Q8_0.gguf \
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

### Access the UI

Open `holodeck.html` directly in a web browser. API settings can be entered in the settings panel without a config file.

Add `?session=name` to the URL to use an independent data store (e.g. `holodeck.html?session=work`). Useful for running multiple separate sessions in the same browser.

Add `?censor=false` to disable the content filter and unlock editing of the content policy prompt.

Both can be combined:

```
holodeck.html?session=private&censor=false
```

## Mobile

<img src="screenshot_mobile.png" width="300" alt="Holodeck mobile screenshot">

### Android setup

1. Download the repository as a ZIP from GitHub (Code → Download ZIP)
2. Open the ZIP in [Cx File Explorer](https://play.google.com/store/apps/details?id=com.cxinventor.file.explorer)
3. Tap `holodeck.html` and open it with a browser — Cx File Explorer starts a local web server automatically, which allows the page to function correctly

Configure the API settings in the settings panel once the page loads.

## License

Licensed under either of [MIT](LICENSE-MIT) or [Apache 2.0](LICENSE-APACHE) at your option.

