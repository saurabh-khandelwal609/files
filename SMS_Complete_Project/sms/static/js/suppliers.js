/* suppliers.js */
let _editSupId = null;

async function loadSuppliers() {
  try {
    const sups = await GET("/api/suppliers");
    const isManager = currentUser && (currentUser.role === "Admin" || currentUser.role === "Manager");
    const isAdmin   = currentUser && currentUser.role === "Admin";
    document.querySelectorAll(".manager-only").forEach(el => el.classList.toggle("hidden", !isManager));
    const tbody = document.getElementById("suppliers-tbody");
    tbody.innerHTML = sups.length ? sups.map(s => `
      <tr>
        <td>${s.supplier_id}</td>
        <td><b>${escHtml(s.supplier_name)}</b></td>
        <td>${escHtml(s.contact_info || "–")}</td>
        <td>${escHtml(s.address || "–")}</td>
        <td class="manager-only ${isManager?"":"hidden"}">
          <button class="btn btn-sm btn-secondary" onclick="openSupplierModal(${s.supplier_id})">Edit</button>
          ${isAdmin ? `<button class="btn btn-sm btn-danger" onclick="deleteSupplier(${s.supplier_id})">Del</button>` : ""}
        </td>
      </tr>`).join("") :
      `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">No suppliers</td></tr>`;
  } catch(e) { showToast(e.message, true); }
}

function openSupplierModal(id = null) {
  _editSupId = id;
  const sup  = id ? null : null; // we'll rely on loaded data
  // find from DOM or re-fetch
  const existing = id ? Array.from(document.querySelectorAll("#suppliers-tbody tr")).find(r => r.cells[0]?.textContent == id) : null;
  const vals = existing ? {
    name: existing.cells[1]?.textContent || "",
    contact: existing.cells[2]?.textContent || "",
    address: existing.cells[3]?.textContent || "",
  } : {};
  const body = `
    <div class="form-group"><label>Supplier Name *</label>
      <input id="s-name" type="text" value="${escHtml(vals.name||"")}" placeholder="Company name"/></div>
    <div class="form-group"><label>Contact Info</label>
      <input id="s-contact" type="text" value="${escHtml(vals.contact===("–")?"":(vals.contact||""))}" placeholder="+1-800-555-0100"/></div>
    <div class="form-group"><label>Address</label>
      <textarea id="s-addr" rows="3" placeholder="Full address">${escHtml(vals.address===("–")?"" :(vals.address||""))}</textarea></div>
  `;
  openModal(id ? "Edit Supplier" : "Add Supplier", body, saveSupplier);
}

async function saveSupplier() {
  const body = {
    supplier_name: document.getElementById("s-name").value.trim(),
    contact_info:  document.getElementById("s-contact").value.trim(),
    address:       document.getElementById("s-addr").value.trim(),
  };
  if (!body.supplier_name) { showToast("Supplier name required", true); return; }
  try {
    if (_editSupId) {
      await PUT(`/api/suppliers/${_editSupId}`, body);
      showToast("Supplier updated ✅");
    } else {
      await POST("/api/suppliers", body);
      showToast("Supplier added ✅");
    }
    closeModal();
    loadSuppliers();
  } catch(e) { showToast(e.message, true); }
}

async function deleteSupplier(id) {
  if (!confirm(`Delete supplier #${id}?`)) return;
  try {
    await DELETE(`/api/suppliers/${id}`);
    showToast("Supplier deleted");
    loadSuppliers();
  } catch(e) { showToast(e.message, true); }
}
