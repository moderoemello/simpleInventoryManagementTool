document.addEventListener('DOMContentLoaded', function() {
    // Get references to elements
    const modeAdd = document.getElementById('modeAdd');
    const modeRemove = document.getElementById('modeRemove');
    const quickAddToggle = document.getElementById('quickAddMode');
    const nameLabel = document.getElementById('nameLabel');
    const submitBtn = document.getElementById('submitButton');
    const upcInput = document.getElementById('upc');
    const nameInput = document.getElementById('name');
    const qtyInput = document.getElementById('quantity');
    const displayUPC = document.getElementById('displayUPC');
    const displayName = document.getElementById('displayName');
    const displayQty = document.getElementById('displayQuantity');
    const lowStockIndicator = document.getElementById('lowStockIndicator');
    const lowStockList = document.getElementById('lowStockList');
    const searchInput = document.getElementById('searchInput');
    const productTableBody = document.getElementById('productTableBody');
    const paginationControls = document.createElement('div'); // Create pagination controls
    paginationControls.id = "paginationControls";
    
    let products = [];
    let currentPage = 1;
    const productsPerPage = 50; // Updated to show more products per page

    function updateMode() {
        if (modeRemove.checked) {
            nameLabel.style.display = 'none';
            nameInput.value = '';
            submitBtn.textContent = 'Remove Product';
        } else {
            nameLabel.style.display = 'inline-block';
            submitBtn.textContent = 'Add/Update Product';
        }
        upcInput.focus();
    }

    modeAdd.addEventListener('change', updateMode);
    modeRemove.addEventListener('change', updateMode);

    quickAddToggle.addEventListener('change', function() {
        if (quickAddToggle.checked) {
            upcInput.focus();
            if (!qtyInput.value || qtyInput.value === '0') {
                qtyInput.value = 1;
            }
        }
    });

    document.getElementById('productForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const mode = modeAdd.checked ? 'add' : 'remove';
        const payload = {
            upc: upcInput.value,
            name: nameInput.value,
            quantity: qtyInput.value
        };
        fetch('/api/' + (mode === 'add' ? 'add' : 'remove'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => response.ok ? response.json() : response.json().then(err => { throw new Error(err.error); }))
        .then(product => {
            displayUPC.textContent = product.upc;
            displayName.textContent = product.name;
            displayQty.textContent = product.quantity;
            lowStockIndicator.style.display = product.lowStock ? 'block' : 'none';
            loadLowStock();
            loadProducts();
            upcInput.value = '';
            nameInput.value = '';
            qtyInput.value = quickAddToggle.checked ? '1' : '';
            upcInput.focus();
        })
        .catch(err => {
            alert(err.message);
            if (err.message.toLowerCase().includes('name is required')) {
                nameInput.focus();
            }
        });
    });

    function loadLowStock() {
        fetch('/api/lowstock')
            .then(res => res.json())
            .then(items => {
                lowStockList.innerHTML = '';
                items.length === 0 ? lowStockList.innerHTML = '<li>No low-stock items.</li>' :
                    items.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = `${item.upc} - ${item.name}: ${item.quantity}`;
                        li.className = 'low-stock-item';
                        lowStockList.appendChild(li);
                    });
            });
    }

    function loadProducts() {
        fetch('/api/products')
            .then(res => res.json())
            .then(data => {
                products = data;
                currentPage = 1; // Reset to first page
                renderProducts();
                renderPaginationControls();
            });
    }

    function renderProducts() {
        productTableBody.innerHTML = '';
        const start = (currentPage - 1) * productsPerPage;
        const end = start + productsPerPage;
        const paginatedProducts = products.slice(start, end);

        paginatedProducts.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.upc}</td><td>${item.name}</td><td>${item.quantity}</td>`;
            productTableBody.appendChild(row);
        });
    }

    function renderPaginationControls() {
        paginationControls.innerHTML = '';
        const totalPages = Math.ceil(products.length / productsPerPage);
        if (totalPages > 1) {
            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.textContent = i;
                btn.classList.add('pagination-btn');
                if (i === currentPage) {
                    btn.classList.add('active');
                }
                btn.addEventListener('click', function() {
                    currentPage = i;
                    renderProducts();
                    renderPaginationControls();
                });
                paginationControls.appendChild(btn);
            }
        }
        productTableBody.parentNode.appendChild(paginationControls);
    }

    searchInput.addEventListener('input', function() {
        const query = searchInput.value.trim().toLowerCase();
        const filteredProducts = products.filter(item => item.name.toLowerCase().includes(query) || item.upc.toLowerCase().includes(query));
        products = filteredProducts;
        currentPage = 1;
        renderProducts();
        renderPaginationControls();
    });

    upcInput.focus();
    loadLowStock();
    loadProducts();
});
