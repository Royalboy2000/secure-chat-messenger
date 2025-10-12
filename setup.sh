#!/bin/bash

# This script automates the complete setup for the Secure Chat Messenger application.

echo "--- Starting Secure Chat Messenger Setup ---"

# Step 1: Install System Dependencies
# This is for Debian/Ubuntu. It will ask for your password.
echo "[1/6] Installing system dependencies (will ask for password)..."
sudo apt-get update && sudo apt-get install -y libmagic1
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install system dependencies. Please ensure you are on a Debian/Ubuntu-based system and can use sudo."
    exit 1
fi
echo "System dependencies installed."

# Step 2: Create Python Virtual Environment
echo "[2/6] Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
echo "Virtual environment created."

# Step 3: Activate Virtual Environment and Install Python Packages
echo "[3/6] Installing Python packages..."
source venv/bin/activate
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Python packages."
    exit 1
fi
echo "Python packages installed."

# Step 4: Generate Security Keys
echo "[4/6] Generating security keys..."
mkdir -p keys
python3 core/generate_keys.py
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate security keys."
    exit 1
fi
echo "Security keys generated in 'keys/' directory."

# Step 5: Create Environment Configuration File
echo "[5/6] Creating .env configuration file..."
cat <<EOT > .env
DATABASE_URL=sqlite:///./sql_app.db
ALGORITHM=RS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
LOG_LEVEL=INFO
IP_SALT=a_very_secret_salt_that_should_be_changed_for_production
EOT
echo ".env file created."

# Step 6: Final Instructions
echo "[6/6] Setup complete!"
echo ""
echo "--- To run the application, use the following commands: ---"
echo ""
echo "1. Activate the virtual environment:"
echo "   source venv/bin/activate"
echo ""
echo "2. Start the server:"
echo "   uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "Then, open your browser to http://127.0.0.1:8000"
echo ""