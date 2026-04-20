/* users.js */
async function loadUsers() {
  try {
    const users = await GET("/api/users");
    const tbody = document.getElementById("users-tbody");
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.user_id}</td>
        <td><b>${escHtml(u.username)}</b></td>
        <td><span class="badge badge-${u.role.toLowerCase()}">${u.role}</span></td>
      </tr>`).join("");
  } catch(e) { showToast(e.message, true); }
}

function openUserModal() {
  const body = `
    <div class="form-group"><label>Username *</label>
      <input id="u-username" type="text" placeholder="Enter username"/></div>
    <div class="form-group"><label>Password *</label>
      <input id="u-password" type="password" placeholder="Enter password"/></div>
    <div class="form-group"><label>Role *</label>
      <select id="u-role">
        <option value="Staff">Staff</option>
        <option value="Manager">Manager</option>
        <option value="Admin">Admin</option>
      </select></div>
  `;
  openModal("Add User", body, saveUser);
}

async function saveUser() {
  const body = {
    username: document.getElementById("u-username").value.trim(),
    password: document.getElementById("u-password").value,
    role:     document.getElementById("u-role").value,
  };
  if (!body.username || !body.password) { showToast("Username and password required", true); return; }
  try {
    await POST("/api/users", body);
    showToast("User created ✅");
    closeModal();
    loadUsers();
  } catch(e) { showToast(e.message, true); }
}
