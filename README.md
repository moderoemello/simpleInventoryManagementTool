# Inventory Management System

A simple inventory management system built with **Node.js**, **Express**, and **SQLite**. The frontend is served from the `public` directory, while the backend handles API requests to manage inventory data.

## Getting Started

### Prerequisites

Before running the project, ensure you have the following installed:

- **Windows OS**
- **Node.js** (Download from [nodejs.org](https://nodejs.org))
- **Git** (Optional, for version control)

### Installation

#### 1. Install Node.js on Windows

- Download the **LTS version** from [nodejs.org](https://nodejs.org)
- Run the installer and follow the setup instructions.
- Verify the installation by opening Command Prompt (`cmd`) and running:

  ```sh
  node -v
  npm -v
  ```

  This should print the installed Node.js and npm versions.

#### 2. Clone the Repository and Install Dependencies

Run the following commands to set up the project:

```sh
git clone https://github.com/moderoemello/simpleInventoryManagementTool.git
cd simpleInventoryManagementTool/
npm init -y
npm install multer sqlite3 express
node server.js
```

If successful, you will see:

```arduino
Server is running at http://localhost:3000
```

#### 3. Access the Application

Open your browser and go to:

```arduino
http://localhost:3000
```

This will load the inventory management UI.

## Project Structure

```bash
/inventory-management
│-- /public          # Contains frontend files (HTML, CSS, JS)
│   │-- index.html   # Main UI
│   │-- style.css    # Styling
│   │-- script.js    # Frontend logic
│-- server.js        # Express backend handling API requests
│-- package.json     # Dependencies & scripts
│-- inventory.db     # SQLite database file
```

## API Endpoints

The backend provides API endpoints for managing inventory:

```http
GET /api/products        # Fetch all products
POST /api/add            # Add/update a product
POST /api/remove         # Decrease product quantity
GET /api/lowstock        # Fetch low-stock items
GET /api/export/json     # Export inventory as JSON
GET /api/export/csv      # Export inventory as CSV
```

## Additional Commands

To install additional packages:

```sh
npm install <package-name>
```

To stop the server, press `CTRL + C` in the terminal.

## License

This project is open-source and free to use.
