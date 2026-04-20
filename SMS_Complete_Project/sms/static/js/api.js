/* api.js — Fetch wrapper with JWT */
const API_BASE = window.location.origin;

async function api(method, path, body = null) {
  const token = sessionStorage.getItem("sms_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const GET    = (path)        => api("GET",    path);
const POST   = (path, body)  => api("POST",   path, body);
const PUT    = (path, body)  => api("PUT",    path, body);
const DELETE = (path)        => api("DELETE", path);
