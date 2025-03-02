const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'inventory.db');
const LOW_STOCK_THRESHOLD = 0;

// Initialize SQLite database (create file if not exists)
let db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Failed to connect to database:', err);
    } else {
        console.log('Connected to SQLite database.');
    }
});
// Create products table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    upc TEXT UNIQUE,
    name TEXT,
    quantity INTEGER
)`);

// Middleware setup
app.use(express.static('public'));        // Serve static files from /public (index.html, etc.)
app.use(express.json());                 // Parse JSON request bodies

// Ensure uploads directory exists for file uploads (used in import)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: 'uploads/' });

// Helper function: Convert array of product objects to CSV format (for export)
function toCSV(rows) {
    let csv = "id,UPC,Name,Quantity\n";  // CSV header
    for (let row of rows) {
        // Escape special characters in name for CSV
        let nameField = row.name.replace(/"/g, '""'); 
        if (nameField.search(/"|,|\n/) !== -1) {
            nameField = `"${nameField}"`;  // wrap in quotes if contains commas, quotes, or newlines
        }
        csv += `${row.id},${row.upc},${nameField},${row.quantity}\n`;
    }
    return csv;
}

// **GET /api/lowstock** – Retrieve all products with low stock (quantity <= threshold)
app.get('/api/lowstock', (req, res) => {
    db.all("SELECT upc, name, quantity FROM products WHERE quantity <= ?", [LOW_STOCK_THRESHOLD], (err, rows) => {
        if (err) {
            console.error('DB error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        return res.json(rows);  // returns an array of low-stock product objects
    });
});

// **GET /api/products** – Retrieve all products for display
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", (err, rows) => {
        if (err) {
            console.error('DB read error:', err);
            return res.status(500).json({ error: "Database error" });
        }
        return res.json(rows);
    });
});

// **POST /api/add** – Add a new product or update an existing product's quantity
app.post('/api/add', (req, res) => {
    const upc = req.body.upc ? req.body.upc.trim() : "";
    const name = req.body.name ? req.body.name.trim() : "";
    let qty = parseInt(req.body.quantity);
    if (isNaN(qty) || qty < 1) {
        qty = 1;  // default quantity to 1 if not provided or invalid
    }
    if (!upc) {
        return res.status(400).json({ error: "UPC is required" });
    }
    // Check if a product with this UPC already exists
    db.get("SELECT * FROM products WHERE upc = ?", [upc], (err, row) => {
        if (err) {
            console.error('DB lookup error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (row) {
            // Existing product: increment quantity and update name (if a new name is provided)
            const newQuantity = row.quantity + qty;
            const updatedName = name ? name : row.name;
            db.run("UPDATE products SET name = ?, quantity = ? WHERE upc = ?", [updatedName, newQuantity, upc], (err) => {
                if (err) {
                    console.error('DB update error:', err);
                    return res.status(500).json({ error: 'Failed to update product' });
                }
                // Respond with updated product info
                const lowStock = newQuantity <= LOW_STOCK_THRESHOLD;
                return res.json({ upc: upc, name: updatedName, quantity: newQuantity, lowStock: lowStock });
            });
        } else {
            // New product: insert into the database (name is required in this case)
            if (!name) {
                return res.status(400).json({ error: "Product name is required for new items" });
            }
            db.run("INSERT INTO products (upc, name, quantity) VALUES (?, ?, ?)", [upc, name, qty], function(err) {
                if (err) {
                    console.error('DB insert error:', err);
                    // If a UNIQUE constraint fails (duplicate UPC), inform the client
                    return res.status(500).json({ error: 'Failed to insert product (duplicate UPC?)' });
                }
                // New product added successfully
                const lowStock = qty <= LOW_STOCK_THRESHOLD;
                return res.json({ upc: upc, name: name, quantity: qty, lowStock: lowStock });
            });
        }
    });
});

// **POST /api/remove** – Decrement the quantity of an existing product
app.post('/api/remove', (req, res) => {
    const upc = req.body.upc ? req.body.upc.trim() : "";
    let qty = parseInt(req.body.quantity);
    if (isNaN(qty) || qty < 1) {
        qty = 1;  // default to 1 if not provided
    }
    if (!upc) {
        return res.status(400).json({ error: "UPC is required" });
    }
    // Find the product by UPC
    db.get("SELECT * FROM products WHERE upc = ?", [upc], (err, row) => {
        if (err) {
            console.error('DB lookup error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            // Cannot remove an item that doesn't exist
            return res.status(404).json({ error: "Product not found" });
        }
        // Calculate new quantity (don't allow negative quantities)
        const newQuantity = row.quantity - qty >= 0 ? row.quantity - qty : 0;
        db.run("UPDATE products SET quantity = ? WHERE upc = ?", [newQuantity, upc], (err) => {
            if (err) {
                console.error('DB update error:', err);
                return res.status(500).json({ error: 'Failed to update product' });
            }
            const lowStock = newQuantity <= LOW_STOCK_THRESHOLD;
            return res.json({ upc: upc, name: row.name, quantity: newQuantity, lowStock: lowStock });
        });
    });
});

// **GET /api/export/json** – Export the entire inventory as JSON
app.get('/api/export/json', (req, res) => {
    db.all("SELECT * FROM products", (err, rows) => {
        if (err) {
            console.error('DB read error:', err);
            return res.status(500).send("Database error");
        }
        // Send JSON file as download
        res.setHeader('Content-Disposition', 'attachment; filename="inventory.json"');
        res.json(rows);
    });
});

// **GET /api/export/csv** – Export the entire inventory as CSV
app.get('/api/export/csv', (req, res) => {
    db.all("SELECT * FROM products", (err, rows) => {
        if (err) {
            console.error('DB read error:', err);
            return res.status(500).send("Database error");
        }
        const csvData = toCSV(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
        res.send(csvData);
    });
});

// **GET /api/export/sqlite** – Download the SQLite database file
app.get('/api/export/sqlite', (req, res) => {
    res.download(DB_FILE, 'inventory.db');
});

// **POST /api/import** – Import data from an uploaded file (JSON, CSV, or SQLite database)
app.post('/api/import', upload.single('importFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }
    const filePath = req.file.path;
    const fileName = req.file.originalname.toLowerCase();
    if (fileName.endsWith('.json')) {
        // Import from JSON file
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('File read error:', err);
                return res.status(500).send("Failed to read uploaded file");
            }
            let products;
            try {
                products = JSON.parse(data);
            } catch (e) {
                console.error('JSON parse error:', e);
                return res.status(400).send("Invalid JSON file format");
            }
            if (!Array.isArray(products)) {
                return res.status(400).send("JSON file must contain an array of products");
            }
            // Clear current table and insert products from JSON
            db.run("DELETE FROM products", (err) => {
                if (err) {
                    console.error('DB clear error:', err);
                    return res.status(500).send("Failed to clear existing data");
                }
                if (products.length === 0) {
                    return res.redirect('/');
                }
                let remaining = products.length;
                for (let item of products) {
                    if (!item.upc || !item.name) {
                        remaining--;
                        if (remaining === 0) res.redirect('/');
                        continue;
                    }
                    const qty = item.quantity ? parseInt(item.quantity) : 0;
                    db.run(
                        "INSERT OR REPLACE INTO products (upc, name, quantity) VALUES (?, ?, ?)",
                        [item.upc, item.name, qty],
                        (err) => {
                            if (err) console.error('Insert error during JSON import:', err);
                            remaining--;
                            if (remaining === 0) {
                                return res.redirect('/');
                            }
                        }
                    );
                }
            });
        });
    } else if (fileName.endsWith('.csv')) {
        // Import from CSV file
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('File read error:', err);
                return res.status(500).send("Failed to read uploaded file");
            }
            const lines = data.split(/\r?\n/);
            let startIndex = 0;
            if (lines[0] && lines[0].toLowerCase().includes('upc')) {
                startIndex = 1;
            }
            db.run("DELETE FROM products", (err) => {
                if (err) {
                    console.error('DB clear error:', err);
                    return res.status(500).send("Failed to clear existing data");
                }
                let pending = 0;
                for (let i = startIndex; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    let parts;
                    if (line.indexOf('"') !== -1) {
                        const firstQuote = line.indexOf('"');
                        const lastQuote = line.lastIndexOf('"');
                        const nameField = line.substring(firstQuote + 1, lastQuote).replace(/""/g, '"');
                        const before = line.substring(0, firstQuote);
                        const after = line.substring(lastQuote + 1);
                        const beforeParts = before.split(',').map(s => s.trim()).filter(s => s);
                        const afterParts = after.split(',').map(s => s.trim()).filter(s => s);
                        const id = beforeParts[0];
                        const upc = beforeParts[1];
                        const name = nameField;
                        const quantity = afterParts[0];
                        parts = [upc, name, quantity];
                    } else {
                        parts = line.split(',');
                    }
                    if (parts.length < 4) continue;
                    const upc = parts[1]?.trim();
                    const name = parts[2]?.trim();
                    let quantity = parseInt(parts[3]);
                    if (!upc || !name) continue;
                    if (isNaN(quantity)) quantity = 0;
                    pending++;
                    db.run(
                        "INSERT OR REPLACE INTO products (upc, name, quantity) VALUES (?, ?, ?)",
                        [upc, name, quantity],
                        (err) => {
                            if (err) console.error('Insert error during CSV import:', err);
                            pending--;
                            if (pending === 0) {
                                return res.redirect('/');
                            }
                        }
                    );
                }
                if (pending === 0) {
                    return res.redirect('/');
                }
            });
        });
    } else if (fileName.endsWith('.db') || fileName.endsWith('.sqlite')) {
        db.close((err) => {
            if (err) {
                console.error('DB close error:', err);
                return res.status(500).send("Failed to close database for import");
            }
            try {
                fs.copyFileSync(filePath, DB_FILE);
            } catch (e) {
                console.error('File copy error:', e);
                db = new sqlite3.Database(DB_FILE);
                return res.status(500).send("Failed to replace database file");
            }
            db = new sqlite3.Database(DB_FILE, (err) => {
                if (err) {
                    console.error('DB reopen error:', err);
                    return res.status(500).send("Database import failed");
                }
                db.run(`CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY,
                    upc TEXT UNIQUE,
                    name TEXT,
                    quantity INTEGER
                )`);
                return res.redirect('/');
            });
        });
    } else {
        return res.status(400).send("Unsupported file type");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
