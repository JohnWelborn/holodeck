# Holodeck

A browser-based interactive fiction engine for simulating multi-character scenes, where each AI character operates from its own filtered context and subjective view of the cast.

## Disclaimer

This repository was built as an exercise in AI-assisted coding.

## Model

Designed for use with [Mistral-Small-23B-Instruct-2501](https://huggingface.co/mistralai/Mistral-Small-24B-Instruct-2501) via a local server (OpenAI-compatible API). See `mistral-v7-tekken-roleplay-guide.v3.md` for prompt engineering notes specific to this model and setup.

Any OpenAI-compatible endpoint works — base URL, model name, and API token are all configurable at runtime.

## Setup

1. Copy `config.example.yaml` to `config.yaml` and fill in your API details.
2. Start the model backend (see [INSTALLATION.md](INSTALLATION.md) for first-time setup):
   ```
   uv run --extra backend python backend.py
   ```
3. Launch the UI server:
   ```
   uv run launch.py
   ```
4. Open `http://localhost:8080` in your browser.

Alternatively, open `holodeck.html` directly — API settings can be entered in the settings panel without a config file.

## Features

- Per-character LLM calls with filtered transcripts and subjective cast lists
- Programs: named scenes with participants, environments, and scenarios
- AI program generation from a premise
- Message editing, regeneration, and generation history
- CYOA suggestions, auto-advance, and text expansion modes
- Presence toggling — characters entering/leaving the scene filter context accordingly
- Export/import/reset for full session persistence
- PG-13 content filter toggle

## License

Licensed under either of [MIT](LICENSE-MIT) or [Apache 2.0](LICENSE-APACHE) at your option.

