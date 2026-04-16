# Owl Dawn AI - Setup & Run Script
Set-Location $PSScriptRoot

Write-Host "Step 1: Installing root (frontend) dependencies..."
npm install

Write-Host "Step 2: Installing backend dependencies..."
npm --prefix backend_node install

Write-Host "Setup complete! Starting frontend + backend..."
npm run start
