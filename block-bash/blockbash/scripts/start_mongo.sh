#!/bin/bash

# Define the SQLite database file path
DB_FILE="./databases/database.sqlite"

if [ -f "$DB_FILE" ]; then
    echo "SQLite database file found at $DB_FILE."
else
    echo "SQLite database file not found. Generating database.sqlite..."
    # Run the Node script to create the SQLite database
    node generate_database_sql.js
    if [ -f "$DB_FILE" ]; then
      echo "SQLite database created successfully at $DB_FILE."
    else
      echo "Failed to create SQLite database."
      exit 1
    fi
fi

echo "SQLite database is ready to use at $DB_FILE."
