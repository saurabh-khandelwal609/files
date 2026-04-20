/* reports.js */
let _reportData = [];

function initReports() { updateReportUI(); }

function updateReportUI() {
  const type = document.getElementById("report-type").value;
  const dateCtrl = document.getElementById("date-range-controls");
  dateCtrl.style.display = type === "sales" ? "" : "none";
}

async function loadReport() {
  const type = document.getElementById("report-type").value;
  try {
    let data, title, summary = [];
    if (type === "sales") {
      const from = document.getElementById("report-from").value;
      const to   = document.getElementById("report-to").value;
      data = await GET(`/api/reports/sales?from=${from}&to=${to}`);
      title = `Daily Sales Report (${from} → ${to})`;
      _reportData = data.rows;
      summary = [
        { label: "Total Revenue",    value: fmtCurrency(data.total_revenue),    color: "kpi-green" },
        { label: "Total Items Sold", value: data.total_items_sold,               color: "kpi-blue"  },
        { label: "Transactions",     value: data.rows.length,                    color: "kpi-yellow"},
      ];
      renderSalesTable(data.rows);
    } else {
      data = await GET("/api/reports/stock");
      title = `Stock on Hand Report (as of ${data.generated_at})`;
      _reportData = data.rows;
      const outOfStock = data.rows.filter(r => r.status === "Out of Stock").length;
      const lowStock   = data.rows.filter(r => r.status === "Low Stock").length;
      summary = [
        { label: "Total Stock Value",  value: fmtCurrency(data.total_stock_value), color: "kpi-green"  },
        { label: "Out of Stock Items", value: outOfStock,                           color: "kpi-red"    },
        { label: "Low Stock Items",    value: lowStock,                             color: "kpi-yellow" },
        { label: "Total SKUs",         value: data.rows.length,                     color: "kpi-blue"   },
      ];
      renderStockTable(data.rows);
    }
    document.getElementById("report-title").textContent = title;
    // Summary KPIs
    const sumEl = document.getElementById("report-summary");
    sumEl.innerHTML = summary.map(s => `
      <div class="kpi-card ${s.color}">
        <div class="kpi-info"><div class="kpi-value">${s.value}</div><div class="kpi-label">${s.label}</div></div>
      </div>`).join("");
    sumEl.style.gridTemplateColumns = `repeat(${summary.length},1fr)`;
  } catch(e) { showToast(e.message, true); }
}

function renderSalesTable(rows) {
  document.getElementById("report-thead").innerHTML = `
    <tr><th>Date</th><th>SKU</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>By</th></tr>`;
  document.getElementById("report-tbody").innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td>${fmtDate(r.date)}</td>
      <td><code>${escHtml(r.sku)}</code></td>
      <td>${escHtml(r.product_name)}</td>
      <td>${r.quantity}</td>
      <td>${fmtCurrency(r.unit_price)}</td>
      <td><b>${fmtCurrency(r.total_value)}</b></td>
      <td>${escHtml(r.username)}</td>
    </tr>`).join("") :
    `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No sales in this period</td></tr>`;
}

function renderStockTable(rows) {
  document.getElementById("report-thead").innerHTML = `
    <tr><th>SKU</th><th>Name</th><th>Category</th><th>Qty</th><th>Reorder Pt</th><th>Unit Price</th><th>Stock Value</th><th>Supplier</th><th>Status</th></tr>`;
  document.getElementById("report-tbody").innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td><code>${escHtml(r.sku)}</code></td>
      <td>${escHtml(r.name)}</td>
      <td>${escHtml(r.category||"–")}</td>
      <td><b>${r.quantity}</b></td>
      <td>${r.reorder_point}</td>
      <td>${fmtCurrency(r.price)}</td>
      <td>${fmtCurrency(r.stock_value)}</td>
      <td>${escHtml(r.supplier_name)}</td>
      <td><span class="badge badge-${r.status==="OK"?"ok":r.status==="Low Stock"?"low":"out"}">${r.status}</span></td>
    </tr>`).join("") :
    `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted)">No data</td></tr>`;
}

function exportCSV() {
  if (!_reportData.length) { showToast("Generate a report first", true); return; }
  const keys = Object.keys(_reportData[0]);
  const csv  = [keys.join(","), ..._reportData.map(r => keys.map(k => `"${r[k]??""}"`.replace(/\n/g," ")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `sms_report_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  showToast("CSV exported ✅");
}
