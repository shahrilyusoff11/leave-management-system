#!/bin/bash

echo "=== Leave Management System Setup ==="

# Create necessary directories
echo "Creating directories..."
mkdir -p uploads
mkdir -p logs

# Check if config.yaml exists
if [ ! -f "config.yaml" ]; then
    echo "Creating config.yaml..."
    cp config.yaml.example config.yaml
    echo "Please edit config.yaml with your database credentials"
fi

# Check if go.mod exists
if [ ! -f "go.mod" ]; then
    echo "Initializing Go module..."
    go mod init leave-management-system
fi

# Download dependencies
echo "Downloading dependencies..."
go mod download

echo "=== Setup Complete ==="
echo "Run 'docker compose up --build' to start the system"