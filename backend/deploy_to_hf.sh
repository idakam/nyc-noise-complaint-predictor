#!/bin/bash

echo "🚀 Deploying to Hugging Face..."

hf upload idakam/nyc-noise-backend main.py main.py --repo-type space
hf upload idakam/nyc-noise-backend requirements.txt requirements.txt --repo-type space
hf upload idakam/nyc-noise-backend Dockerfile Dockerfile --repo-type space
hf upload idakam/nyc-noise-backend README.md README.md --repo-type space
hf upload idakam/nyc-noise-backend routers/ routers/ --repo-type space
hf upload idakam/nyc-noise-backend src/ src/ --repo-type space
hf upload idakam/nyc-noise-backend models/ models/ --repo-type space
hf upload idakam/nyc-noise-backend data/processed/ data/processed/ --repo-type space

echo "✅ Done! Check https://huggingface.co/spaces/idakam/nyc-noise-backend"
