/* app.js — Router, toast, modal, init */

/* ── Toast ─────────────────────────────────────────────────── */
let _toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast" + (isError ? " toast-error" : "");
  t.classList.remove("hidden");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.add("hidden"), 3000);
}

/* ── Modal ─────────────────────────────────────────────────── */
let _modalSaveHandler = null;
function openModal(title, bodyHTML, saveHandler) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML    = bodyHTML;
  _modalSaveHandler = saveHandler;
  document.getElementById("modal-overlay").classList.remove("hidden");
}
function closeModal(e) {
  if (e && e.target !== document.getElementById("modal-overlay")) return;
  document.getElementById("modal-overlay").classList.add("hidden");
  _modalSaveHandler = null;
}
function saveModal() {
  if (_modalSaveHandler) _modalSaveHandler();
}

/* ── Router ─────────────────────────────────────────────────── */
const PAGES = ["dashboard","products","transactions","suppliers","reports","users"];
function navigateTo(page) {
  PAGES.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.classList.toggle("hidden", p !== page);
  });
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.page === page);
  });
  closeSidebar();
  // lazy load page data
  if (page === "dashboard")    loadDashboard();
  if (page === "products")     loadProducts();
  if (page === "transactions") loadTransactions();
  if (page === "suppliers")    loadSuppliers();
  if (page === "reports")      initReports();
  if (page === "users")        loadUsers();
}

/* ── Sidebar mobile ─────────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("hidden");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.add("hidden");
}

/* ── Init app after login ───────────────────────────────────── */
function initApp() {
  const username = sessionStorage.getItem("sms_username") || "User";
  const role     = sessionStorage.getItem("sms_role")     || "Staff";
  currentUser    = { username, role };

  document.getElementById("user-name").textContent   = username;
  document.getElementById("user-role").textContent   = role;
  document.getElementById("user-avatar").textContent = username[0].toUpperCase();

  // Role-based visibility
  const isAdmin   = role === "Admin";
  const isManager = isAdmin || role === "Manager";

  document.querySelectorAll(".admin-only").forEach(el =>
    el.classList.toggle("hidden", !isAdmin));
  document.querySelectorAll(".manager-only").forEach(el =>
    el.classList.toggle("hidden", !isManager));

  document.getElementById("login-page").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  // Nav click handlers
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Init dates
  const today = new Date().toISOString().split("T")[0];
  const from30 = new Date(Date.now() - 30*86400000).toISOString().split("T")[0];
  document.getElementById("report-from").value = from30;
  document.getElementById("report-to").value   = today;
  document.getElementById("txn-from").value    = from30;
  document.getElementById("txn-to").value      = today;

  navigateTo("dashboard");
}

/* ── Auto-restore session ───────────────────────────────────── */
window.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage.getItem("sms_token");
  if (token) initApp();
});

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtCurrency(v) { return "₹" + Number(v).toLocaleString("en-IN", {minimumFractionDigits:2}); }
function fmtDate(d)     { return new Date(d).toLocaleDateString("en-IN"); }
function escHtml(s)     { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
