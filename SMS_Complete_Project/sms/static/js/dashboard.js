/* dashboard.js */
async function loadDashboard() {
  document.getElementById("dashboard-date").textContent =
    new Date().toLocaleDateString("en-IN", {weekday:"long", year:"numeric", month:"long", day:"numeric"});
  try {
    const d = await GET("/api/dashboard");
    document.getElementById("kpi-total").textContent = d.total_products;
    document.getElementById("kpi-out").textContent   = d.out_of_stock;
    document.getElementById("kpi-low").textContent   = d.low_stock;
    document.getElementById("kpi-rev").textContent   = fmtCurrency(d.today_revenue);

    // Recent transactions
    const tbody = document.getElementById("recent-tbody");
    tbody.innerHTML = d.recent_transactions.length ? d.recent_transactions.map(t => `
      <tr>
        <td><code>${escHtml(t.sku)}</code></td>
        <td>${escHtml(t.product_name)}</td>
        <td><span class="badge badge-${t.type.toLowerCase()}">${t.type}</span></td>
        <td><b>${t.quantity}</b></td>
        <td>${fmtDate(t.date)}</td>
        <td>${escHtml(t.username)}</td>
      </tr>`) .join("") :
      `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">No transactions yet</td></tr>`;

    // Low stock
    const list = document.getElementById("low-stock-list");
    list.innerHTML = d.low_stock_items.length ? d.low_stock_items.map(p => `
      <div class="alert-item">
        <div><div class="sku">${escHtml(p.sku)}</div><div style="font-size:.78rem;color:var(--text-muted)">${escHtml(p.name)}</div></div>
        <div class="qty">Qty: ${p.quantity} / ${p.reorder_point}</div>
      </div>`).join("") :
      `<div class="alert-empty">✅ All stock levels are healthy</div>`;
  } catch(e) { showToast(e.message, true); }
}
