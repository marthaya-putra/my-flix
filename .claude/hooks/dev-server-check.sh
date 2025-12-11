#!/bin/bash

# Check if dev server is already running on port 3000 or 3001
DEV_SERVER_PORT=3000
ALT_PORT=3001

# Function to check if port is in use
is_port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
    return $?
}

# Check both common ports
if is_port_in_use $DEV_SERVER_PORT; then
    echo "Dev server is already running on port $DEV_SERVER_PORT"
    exit 1
elif is_port_in_use $ALT_PORT; then
    echo "Dev server is already running on port $ALT_PORT"
    exit 1
fi

# If neither port is in use, allow starting new server
exit 0