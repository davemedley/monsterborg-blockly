#!/bin/bash
# Simple run script for MonsterBorg Blockly

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found, creating from example..."
    cp .env.example .env
    echo "✓ Created .env file (using mock mode by default)"
fi

# Run the application
echo "🚀 Starting MonsterBorg Blockly..."
echo ""
python3 backend/app.py

# Made with Bob
