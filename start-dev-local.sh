#!/bin/bash
set -e

EMULATOR_PID=""

cleanup() {
    # Stop background emulators if the script exits early
    if [ -n "$EMULATOR_PID" ]; then
        kill "$EMULATOR_PID" > /dev/null 2>&1 || true
    fi
}

trap cleanup EXIT

echo "🚀 Starting GSDTA Local Development Stack with Firebase Emulators"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo ""
    echo "Please install Firebase CLI using one of these methods:"
    echo ""
    echo "Option 1 (Recommended - uses sudo):"
    echo "  sudo npm install -g firebase-tools"
    echo ""
    echo "Option 2 (Homebrew):"
    echo "  brew install firebase-cli"
    echo ""
    echo "Option 3 (npm with different prefix):"
    echo "  npm install -g firebase-tools --prefix ~/.npm-global"
    echo "  export PATH=~/.npm-global/bin:\$PATH"
    echo ""
    read -p "Press Enter after installing Firebase CLI to continue..."
    
    # Check again after user installation
    if ! command -v firebase &> /dev/null; then
        echo "❌ Firebase CLI still not found. Please install it and try again."
        exit 1
    fi
    echo "✅ Firebase CLI found!"
    echo ""
fi

# Check if Java is installed (required for Firebase emulators)
if ! command -v java > /dev/null 2>&1; then
    echo "❌ Java (JRE/JDK 11+) not found - required for Firebase Emulators."
    echo ""
    echo "Please install Java using one of these methods:"
    echo "  Homebrew (macOS): brew install openjdk@21"
    echo "  SDKMAN:           curl -s \"https://get.sdkman.io\" | bash && sdk install java 21.0.4-tem"
    echo "  Manual download:  https://adoptium.net/"
    exit 1
fi

if ! java -version > /dev/null 2>&1; then
    echo "❌ Java command found but failed to run. Ensure Java 11+ is installed and on your PATH."
    exit 1
fi

# Check if .env.local files exist, if not copy from emulator templates
if [ ! -f "ui/.env.local" ]; then
    echo "📝 Creating ui/.env.local from template..."
    cp ui/.env.local.emulator ui/.env.local
    echo "✅ Created ui/.env.local"
fi

if [ ! -f "api/.env.local" ]; then
    echo "📝 Creating api/.env.local from template..."
    cp api/.env.local.emulator api/.env.local
    echo "✅ Created api/.env.local"
fi

echo ""
echo "Choose your development mode:"
echo "1) Local processes (requires 3 terminals)"
echo "2) Docker Compose (single command, containerized)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🔥 Starting Firebase Emulators..."
        echo ""

        EMULATOR_DATA_DIR="firebase-data"
        SEED_AFTER_START=false
        
        # Check if we should seed data
        if [ -d "$EMULATOR_DATA_DIR" ] && [ "$(ls -A "$EMULATOR_DATA_DIR")" ]; then
            echo "Existing emulator data found."
            read -p "Do you want to seed/reseed data after the emulators start? (y/n): " seed_choice
            if [ "$seed_choice" = "y" ] || [ "$seed_choice" = "Y" ]; then
                SEED_AFTER_START=true
            fi
        else
            echo "No existing emulator data. Will seed after emulators start."
            echo ""
            SEED_AFTER_START=true
        fi

        # Ensure the import/export directory exists for the emulator
        mkdir -p "$EMULATOR_DATA_DIR"
        
        echo "   You'll need to open two more terminals:"
        echo "   Terminal 2: cd api && npm install && npm run dev"
        echo "   Terminal 3: cd ui && npm install && npm run dev"
        echo ""
        echo "📍 Services will be available at:"
        echo "   UI:           http://localhost:3000"
        echo "   API:          http://localhost:8080"
        echo "   Emulator UI:  http://localhost:4445"
        echo ""
        
        # Start emulators in foreground
        firebase emulators:start --project demo-gsdta --import="./$EMULATOR_DATA_DIR" --export-on-exit &
        EMULATOR_PID=$!
        
        # Wait for emulators to start
        echo "⏳ Waiting for emulators to start..."
        EMULATOR_READY=0
        for attempt in {1..15}; do
            if ! kill -0 "$EMULATOR_PID" > /dev/null 2>&1; then
                echo "❌ Firebase emulators process exited early. Check the logs above for errors."
                exit 1
            fi

            if curl -s http://localhost:4445 > /dev/null 2>&1; then
                EMULATOR_READY=1
                break
            fi
            sleep 2
        done

        if [ "$EMULATOR_READY" -ne 1 ]; then
            echo "❌ Emulator UI did not become ready in time. Check the logs above."
            exit 1
        fi
        
        # Seed if requested or no existing data
        if [ "$SEED_AFTER_START" = true ]; then
            echo ""
            echo "🌱 Seeding emulator data..."
            if [ ! -d "scripts/node_modules" ]; then
                echo "📦 Installing seed script dependencies..."
                (cd scripts && npm install)
            fi
            (cd scripts && npm run seed)
            echo ""
        fi
        
        # Keep emulators running
        wait $EMULATOR_PID
        EMULATOR_PID=""
        ;;
    2)
        echo ""
        echo "🐳 Starting Docker Compose stack..."
        docker-compose -f docker-compose.local.yml up --build
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
