#!/bin/bash

# setup-codespace.sh - Install codex-cli and speckit in Codespace
# Usage: bash setup-codespace.sh

set -e  # Exit on error

echo "========================================="
echo "🚀 Installing codex-cli and speckit"
echo "========================================="

# Verify Node is available (should be pre-installed)
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found! This shouldn't happen in Codespaces."
    exit 1
else
    echo "✅ npm found: $(npm --version)"
fi

# Verify Python is available (should be pre-installed)
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 not found! This shouldn't happen in Codespaces."
    exit 1
else
    echo "✅ pip3 found: $(pip3 --version)"
fi

# 1. Install codex-cli via npm (global installation)
echo "📦 Installing codex-cli..."
npm install -g codex-cli

# Verify codex installation
if command -v codex &> /dev/null; then
    echo "✅ codex-cli installed: $(codex --version 2>/dev/null || echo 'version unknown')"
else
    echo "⚠️ codex-cli installation may need verification"
fi

# 2. Install speckit via pip
echo "🔭 Installing speckit..."
pip3 install speckit

# Verify speckit installation
python3 -c "import speckit; print(f'✅ speckit installed: {speckit.__version__ if hasattr(speckit, \"__version__\") else \"version unknown\"}')" 2>/dev/null || echo "⚠️ speckit import failed"

# Add helpful aliases to bashrc (optional)
echo "⚙️ Adding aliases to ~/.bashrc..."
cat >> ~/.bashrc << 'EOF'

# Codex and Speckit aliases
alias codex-version='codex --version'
alias speckit-version='python3 -c "import speckit; print(speckit.__version__ if hasattr(speckit, \"__version__\") else \"installed\")"'
EOF

echo "========================================="
echo "✅ Installation complete!"
echo "========================================="
echo ""
echo "Commands now available:"
echo "  - codex (from codex-cli)"
echo "  - speckit (Python import)"
echo ""
echo "Quick test:"
echo "  codex --help"
echo "  python3 -c 'import speckit; print(\"OK\")'"
echo ""
echo "To apply aliases, run: source ~/.bashrc"
