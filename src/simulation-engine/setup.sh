#!/bin/bash
# Setup script for The Simulation Space multi-agent engine
# Run from the simulation-engine directory

set -e

echo "=== The Simulation Space — Simulation Engine Setup ==="
echo ""

cd "$(dirname "$0")"

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv .venv
else
    echo "Virtual environment already exists."
fi

# Activate
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    source .venv/Scripts/activate
else
    source .venv/bin/activate
fi

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "=== Setup complete ==="
echo ""
echo "Make sure these are in your .env.local:"
echo "  ZEP_API_KEY=your_zep_cloud_key"
echo "  GEMINI_API_KEY=your_gemini_key (already set)"
echo ""
echo "To run manually: python run_simulation.py < config.json"
