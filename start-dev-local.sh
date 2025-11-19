#!/bin/bash
set -e

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
        
        # Check if we should seed data
        if [ -d "firebase-data" ]; then
            echo "Existing emulator data found."
            read -p "Do you want to seed/reseed data? (y/n): " seed_choice
            if [ "$seed_choice" = "y" ] || [ "$seed_choice" = "Y" ]; then
                echo ""
                echo "🌱 Seeding emulator data..."
                cd scripts && npm run seed && cd ..
                echo ""
            fi
        else
            echo "No existing emulator data. Will seed after emulators start."
            echo ""
        fi
        
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
        firebase emulators:start --project demo-gsdta --import=./firebase-data --export-on-exit &
        EMULATOR_PID=$!
        
        # Wait for emulators to start
        echo "⏳ Waiting for emulators to start..."
        sleep 8
        
        # Seed if no existing data
        if [ ! -d "firebase-data" ]; then
            echo ""
            echo "🌱 Seeding initial data..."
            cd scripts && npm run seed && cd ..
            echo ""
        fi
        
        # Keep emulators running
        wait $EMULATOR_PID
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
