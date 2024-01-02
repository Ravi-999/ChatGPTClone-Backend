#!/bin/bash

# Check if Node.js is installed
if command -v node &> /dev/null
then
    # Check if npm is installed
    if command -v npm &> /dev/null
    then
        # Run npm start for your Node project
        npm start
    else
        echo "npm is not installed. Please install npm before running this script."
    fi
else
    echo "Node.js is not installed. Please install Node.js before running this script."
fi
