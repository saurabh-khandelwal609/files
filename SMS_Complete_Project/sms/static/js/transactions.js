/* transactions.js */
async function loadTransactions() {
  const type    = document.getElementById("txn-type").value;
  const from    = document.getElementById("txn-from").value;
  const to      = document.getElementById("txn-to").value;
  let params    = [];
  if (type) params.push(`type=${type}`);
  if (from) params.push(`from=${from}`);
  if (to)   params.push(`to=${to}`);
  try {
    const txns  = await GET(`/api/transactions?${params.join("&")}`);
    const isAdmin = currentUser && currentUser.role === "Admin";
    const tbody = document.getElementById("txn-tbody");
    document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));
    tbody.innerHTML = txns.length ? txns.map(t => `
      <tr>
        <td>#${t.transaction_id}</td>
        <td><code>${escHtml(t.sku)}</code></td>
        <td>${escHtml(t.product_name)}</td>
        <td><span class="badge badge-${t.type.toLowerCase()}">${t.type}</span></td>
        <td><b>${t.quantity}</b></td>
        <td>${fmtCurrency(t.total_value)}</td>
        <td>${fmtDate(t.date)}</td>
        <td>${escHtml(t.username)}</td>
        <td class="admin-only ${isAdmin?"":"hidden"}">
          <button class="btn btn-sm btn-danger" onclick="deleteTxn(${t.transaction_id})">Del</button>
        </td>
      </tr>`).join("") :
      `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted)">No transactions found</td></tr>`;
  } catch(e) { showToast(e.message, true); }
}

async function openTxnModal() {
  let products = [];
  try { products = await GET("/api/products"); } catch(e){}
  const today = new Date().toISOString().split("T")[0];
  const prodOptions = products.map(p =>
    `<option value="${escHtml(p.sku)}">${escHtml(p.sku)} — ${escHtml(p.name)} (Qty: ${p.quantity})</option>`
  ).join("");
  const body = `
    <div class="form-group"><label>Product *</label>
      <select id="t-sku"><option value="">Select product…</option>${prodOptions}</select></div>
    <div class="form-group"><label>Transaction Type *</label>
      <select id="t-type"><option value="Sale">Sale</option><option value="Purchase">Purchase</option></select></div>
    <div class="form-group"><label>Quantity *</label>
      <input id="t-qty" type="number" min="1" placeholder="Enter quantity"/></div>
    <div class="form-group"><label>Date *</label>
      <input id="t-date" type="date" value="${today}"/></div>
  `;
  openModal("New Transaction", body, saveTxn);
}

async function saveTxn() {
  const body = {
    sku:      document.getElementById("t-sku").value,
    type:     document.getElementById("t-type").value,
    quantity: parseInt(document.getElementById("t-qty").value),
    date:     document.getElementById("t-date").value,
  };
  if (!body.sku || !body.date || isNaN(body.quantity) || body.quantity < 1) {
    showToast("Fill all fields correctly", true); return;
  }
  try {
    const res = await POST("/api/transactions", body);
    let msg = `${body.type} recorded ✅ | New stock: ${res.new_quantity}`;
    if (res.low_stock_alert) msg += " ⚠️ Low stock!";
    showToast(msg);
    closeModal();
    loadTransactions();
    loadDashboard();
  } catch(e) { showToast(e.message, true); }
}

async function deleteTxn(id) {
  if (!confirm(`Delete transaction #${id}?`)) return;
  try {
    await DELETE(`/api/transactions/${id}`);
    showToast("Transaction deleted");
    loadTransactions();
  } catch(e) { showToast(e.message, true); }
}
