#!/bin/bash

# Ensure we are in the script's directory, then navigate to the project
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR" || exit

PROJECT_DIR="microscope-web"
URL="http://localhost:5173"

echo "Navigating to $PROJECT_DIR..."
cd "$PROJECT_DIR" || { echo "Error: Project directory '$PROJECT_DIR' not found."; exit 1; }

echo "Starting Vite development server in the foreground. Press Ctrl+C to stop it."

# Open browser in background after a delay to allow server to start
(
    sleep 5
    echo "Opening application in browser: $URL"
    start "$URL"
) &

# Run npm dev in the foreground. This will block until Ctrl+C is pressed.
npm run dev

echo "Development server process terminated."
