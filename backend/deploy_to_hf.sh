#!/bin/bash

echo "🚀 Deploying to Hugging Face..."

huggingface-cli upload idakam/nyc-noise-backend backend/main.py main.py --repo-type space
huggingface-cli upload idakam/nyc-noise-backend backend/requirements.txt requirements.txt --repo-type space
huggingface-cli upload idakam/nyc-noise-backend backend/Dockerfile Dockerfile --repo-type space
huggingface-cli upload idakam/nyc-noise-backend backend/README.md README.md --repo-type space
huggingface-cli upload idakam/nyc-noise-backend backend/routers/ routers/ --repo-type space
huggingface-cli upload idakam/nyc-noise-backend backend/src/ src/ --repo-type space
huggingface-cli upload idakam/nyc-noise-backend backend/models/ models/ --repo-type space
huggingface-cli upload idakam/nyc-noise-backend backend/data/processed/ data/processed/ --repo-type space

echo "✅ Done! Check https://huggingface.co/spaces/idakam/nyc-noise-backend"
