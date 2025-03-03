Inventory Management System

#Getting Started

This project is a simple inventory management system built with Node.js, Express, and SQLite. The frontend is served from the public directory, and the backend handles API requests to manage inventory data.

Prerequisites

Before running the project, ensure you have the following installed:

Windows OS

Node.js (Download from nodejs.org)

Git (Optional, for version control)

Installation

1. Install Node.js on Windows

Download the Node.js LTS version from nodejs.org

Run the installer and follow the setup instructions.

Verify installation by opening Command Prompt (cmd) and running:

node -v

npm -v

This should print the installed Node.js and npm versions. 

then run this to clone this repo, install dependencies, start the local server:

git clone https://github.com/moderoemello/simpleInventoryManagementTool.git
cd simpleInventoryManagementTool/
npm init -y 
npm install multer sqlite3 express
node server.js

If successful, you will see:

Server is running at http://localhost:3000

2. Access the Application

Open your browser and go to:

http://localhost:3000

This will load the inventory management UI.

Project Structure

/inventory-management

│-- /public          # Contains frontend files (HTML, CSS, JS)

│   │-- index.html   # Main UI

│   │-- style.css    # Styling

│   │-- script.js    # Frontend logic

│-- server.js        # Express backend handling API requests

│-- package.json     # Dependencies & scripts

│-- inventory.db     # SQLite database file


API Endpoints

The backend provides API endpoints for managing inventory:

GET /api/products - Fetch all products

POST /api/add - Add/update a product

POST /api/remove - Decrease product quantity

GET /api/lowstock - Fetch low-stock items

GET /api/export/json - Export inventory as JSON

GET /api/export/csv - Export inventory as CSV

Additional Commands

To install additional packages:

npm install <package-name>

To stop the server, press CTRL + C in the terminal.

License

This project is open-source and free to use.

