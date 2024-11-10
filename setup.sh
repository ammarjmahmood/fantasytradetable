#!/bin/bash

# Print colored output
print_message() {
    echo -e "\e[34m>> $1\e[0m"
}

print_error() {
    echo -e "\e[31m>> Error: $1\e[0m"
}

print_success() {
    echo -e "\e[32m>> Success: $1\e[0m"
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)

# Install Node.js and npm based on OS
install_node() {
    case $OS in
        "macos")
            print_message "Installing Node.js and npm via Homebrew..."
            if ! command -v brew &> /dev/null; then
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install node
            ;;
        "linux")
            print_message "Installing Node.js and npm via apt..."
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "windows")
            print_error "For Windows, please download and install Node.js from: https://nodejs.org/"
            print_error "After installing Node.js, run this script again."
            exit 1
            ;;
        *)
            print_error "Unsupported operating system. Please install Node.js manually from: https://nodejs.org/"
            exit 1
            ;;
    esac
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_message "Node.js not found. Installing Node.js and npm..."
    install_node
else
    print_message "Node.js is already installed ($(node --version))"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Installing npm..."
    install_node
else
    print_message "npm is already installed ($(npm --version))"
fi

# Install project dependencies
print_message "Installing project dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_message "Creating .env file..."
    cat > .env << EOL
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CREDENTIALS_BASE64=your_base64_encoded_credentials_here
EOL
    print_message "Created .env file. Please update it with your actual API keys."
fi

# Check if credentials file exists
if [ ! -f "Ballhog IAM Admin.json" ]; then
    print_error "Missing 'Ballhog IAM Admin.json' file. Please add it to the project root directory."
fi

print_success "Setup complete! Please ensure:"
echo "1. You have updated the .env file with your actual API keys"
echo "2. You have placed your 'Ballhog IAM Admin.json' file in the root directory"
echo ""
echo "To start the application:"
echo "- Development mode: npm run dev"
echo "- Production mode: npm start"
echo ""
print_message "Node.js version: $(node --version)"
print_message "npm version: $(npm --version)"

# Verify all required dependencies
print_message "Verifying dependencies..."
required_deps=(
    "@google/generative-ai"
    "cors"
    "dotenv"
    "express"
    "googleapis"
    "node-cache"
    "node-cron"
)

missing_deps=()
for dep in "${required_deps[@]}"; do
    if ! npm list "$dep" >/dev/null 2>&1; then
        missing_deps+=("$dep")
    fi
done

if [ ${#missing_deps[@]} -ne 0 ]; then
    print_error "Missing dependencies found. Installing them now..."
    npm install "${missing_deps[@]}"
else
    print_success "All required dependencies are installed!"
fi