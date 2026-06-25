#!/bin/bash

# Auto Push Script
# Adds all changes, commits them with an optional message or default message, and pushes to origin main.

COMMIT_MSG=${1:-"Auto commit after task completion"}

echo "Adding changes..."
git add .

echo "Committing with message: '$COMMIT_MSG'"
git commit -m "$COMMIT_MSG"

echo "Pushing to remote repository (main)..."
git push origin main

echo "Done!"
