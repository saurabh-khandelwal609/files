/* products.js */
let _allProducts = [];
let _suppliers   = [];
let _editSku     = null;

async function loadProducts() {
  try {
    _allProducts = await GET("/api/products");
    _suppliers   = await GET("/api/suppliers");
    renderProducts(_allProducts);
    // populate category filter
    const cats = [...new Set(_allProducts.map(p => p.category).filter(Boolean))].sort();
    const sel  = document.getElementById("prod-cat");
    sel.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join("");
  } catch(e) { showToast(e.message, true); }
}

function filterProducts() {
  const q   = document.getElementById("prod-search").value.toLowerCase();
  const cat = document.getElementById("prod-cat").value;
  const filtered = _allProducts.filter(p =>
    (!q   || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) &&
    (!cat || p.category === cat)
  );
  renderProducts(filtered);
}

function renderProducts(prods) {
  const isManager = currentUser && (currentUser.role === "Admin" || currentUser.role === "Manager");
  const isAdmin   = currentUser && currentUser.role === "Admin";
  const tbody = document.getElementById("products-tbody");
  tbody.innerHTML = prods.length ? prods.map(p => {
    const status = p.quantity === 0 ? "out" : p.low_stock ? "low" : "ok";
    const label  = p.quantity === 0 ? "Out of Stock" : p.low_stock ? "Low Stock" : "OK";
    return `<tr>
      <td><code>${escHtml(p.sku)}</code></td>
      <td><b>${escHtml(p.name)}</b></td>
      <td>${escHtml(p.category || "–")}</td>
      <td>${fmtCurrency(p.price)}</td>
      <td><b style="color:${p.quantity===0?"var(--danger)":p.low_stock?"var(--warning)":"inherit"}">${p.quantity}</b></td>
      <td>${p.reorder_point}</td>
      <td>${escHtml(p.supplier_name || "–")}</td>
      <td><span class="badge badge-${status}">${label}</span></td>
      <td>
        ${isManager ? `<button class="btn btn-sm btn-secondary" onclick="openProductModal('${escHtml(p.sku)}')">Edit</button> ` : ""}
        ${isAdmin   ? `<button class="btn btn-sm btn-danger"    onclick="deleteProduct('${escHtml(p.sku)}')">Del</button>` : ""}
      </td>
    </tr>`;
  }).join("") : `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted)">No products found</td></tr>`;
}

function openProductModal(sku = null) {
  _editSku = sku;
  const prod = sku ? _allProducts.find(p => p.sku === sku) : null;
  const supOptions = _suppliers.map(s =>
    `<option value="${s.supplier_id}" ${prod && prod.supplier_id === s.supplier_id ? "selected" : ""}>${escHtml(s.supplier_name)}</option>`
  ).join("");
  const body = `
    <div class="form-group"><label>SKU *</label>
      <input id="p-sku" type="text" value="${prod ? escHtml(prod.sku) : ""}" ${prod ? "readonly" : ""} placeholder="e.g. SKU-009"/></div>
    <div class="form-group"><label>Name *</label>
      <input id="p-name" type="text" value="${prod ? escHtml(prod.name) : ""}" placeholder="Product name"/></div>
    <div class="form-group"><label>Category</label>
      <input id="p-cat" type="text" value="${prod ? escHtml(prod.category||"") : ""}" placeholder="Electronics, Office…"/></div>
    <div class="form-group"><label>Price (₹) *</label>
      <input id="p-price" type="number" step="0.01" min="0" value="${prod ? prod.price : ""}"/></div>
    <div class="form-group"><label>Quantity *</label>
      <input id="p-qty" type="number" min="0" value="${prod ? prod.quantity : ""}"/></div>
    <div class="form-group"><label>Reorder Point *</label>
      <input id="p-reorder" type="number" min="0" value="${prod ? prod.reorder_point : ""}"/></div>
    <div class="form-group"><label>Supplier</label>
      <select id="p-sup"><option value="">— None —</option>${supOptions}</select></div>
  `;
  openModal(prod ? "Edit Product" : "Add Product", body, saveProduct);
}

async function saveProduct() {
  const body = {
    sku:           document.getElementById("p-sku").value.trim().toUpperCase(),
    name:          document.getElementById("p-name").value.trim(),
    category:      document.getElementById("p-cat").value.trim(),
    price:         parseFloat(document.getElementById("p-price").value),
    quantity:      parseInt(document.getElementById("p-qty").value),
    reorder_point: parseInt(document.getElementById("p-reorder").value),
    supplier_id:   parseInt(document.getElementById("p-sup").value) || null,
  };
  if (!body.sku || !body.name || isNaN(body.price) || isNaN(body.quantity)) {
    showToast("Please fill all required fields", true); return;
  }
  try {
    if (_editSku) {
      await PUT(`/api/products/${_editSku}`, body);
      showToast("Product updated ✅");
    } else {
      await POST("/api/products", body);
      showToast("Product added ✅");
    }
    closeModal();
    await loadProducts();
  } catch(e) { showToast(e.message, true); }
}

async function deleteProduct(sku) {
  if (!confirm(`Delete product ${sku}? This cannot be undone.`)) return;
  try {
    await DELETE(`/api/products/${sku}`);
    showToast("Product deleted");
    await loadProducts();
  } catch(e) { showToast(e.message, true); }
}
