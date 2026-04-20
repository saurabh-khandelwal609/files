/* auth.js */
let currentUser = null;

function fillDemo(u, p) {
  document.getElementById("login-username").value = u;
  document.getElementById("login-password").value = p;
}
function togglePw() {
  const inp = document.getElementById("login-password");
  inp.type = inp.type === "password" ? "text" : "password";
}
async function doLogin() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-error");
  const btn      = document.getElementById("login-btn");
  const spinner  = document.getElementById("login-spinner");
  errEl.classList.add("hidden");
  btn.disabled = true;
  spinner.classList.remove("hidden");
  try {
    const res = await POST("/api/auth/login", { username, password });
    sessionStorage.setItem("sms_token",    res.token);
    sessionStorage.setItem("sms_username", res.username);
    sessionStorage.setItem("sms_role",     res.role);
    currentUser = { username: res.username, role: res.role };
    initApp();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    spinner.classList.add("hidden");
  }
}
function doLogout() {
  sessionStorage.clear();
  currentUser = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-page").classList.remove("hidden");
}
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && !document.getElementById("login-page").classList.contains("hidden")) doLogin();
});
