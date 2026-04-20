"""
Stock Maintenance System (SMS) — Flask Backend
Run: python app.py
"""
import os, json, hashlib, hmac, base64, time
from datetime import date, datetime, timedelta
from functools import wraps
from http import HTTPStatus

# ── Try to import optional libs gracefully ────────────────────────────────────
try:
    from flask import Flask, request, jsonify, send_from_directory
    from flask_cors import CORS
except ImportError:
    raise SystemExit("Install flask flask-cors:  pip install flask flask-cors")

try:
    import bcrypt
    USE_BCRYPT = True
except ImportError:
    USE_BCRYPT = False

# ── Tiny in-memory "database" (replace with MySQL in production) ──────────────
# In production: use mysql-connector-python + schema.sql

def _hash_pw(pw: str) -> str:
    if USE_BCRYPT:
        return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(12)).decode()
    import hashlib
    return hashlib.sha256(pw.encode()).hexdigest()

def _check_pw(pw: str, hashed: str) -> bool:
    if USE_BCRYPT and hashed.startswith("$2"):
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    import hashlib
    return hashlib.sha256(pw.encode()).hexdigest() == hashed

DB = {
    "users": [
        {"user_id": 1, "username": "admin",    "password": _hash_pw("admin123"),   "role": "Admin"},
        {"user_id": 2, "username": "manager1", "password": _hash_pw("manager123"), "role": "Manager"},
        {"user_id": 3, "username": "staff1",   "password": _hash_pw("staff123"),   "role": "Staff"},
    ],
    "suppliers": [
        {"supplier_id": 1, "supplier_name": "Global Supply Co.",  "contact_info": "+1-800-555-0100", "address": "123 Industrial Ave, Chicago"},
        {"supplier_id": 2, "supplier_name": "Tech Parts Ltd.",     "contact_info": "+1-800-555-0200", "address": "456 Tech Park, San Jose"},
    ],
    "products": [
        {"sku": "SKU-001", "name": 'Laptop Pro 15"',      "category": "Electronics", "price": 999.99, "quantity": 25,  "reorder_point": 5,  "supplier_id": 1},
        {"sku": "SKU-002", "name": "Wireless Mouse",       "category": "Electronics", "price": 29.99,  "quantity": 80,  "reorder_point": 15, "supplier_id": 1},
        {"sku": "SKU-003", "name": "USB-C Cable 2m",       "category": "Accessories", "price": 12.99,  "quantity": 150, "reorder_point": 30, "supplier_id": 2},
        {"sku": "SKU-004", "name": 'Monitor 27" 4K',       "category": "Electronics", "price": 449.99, "quantity": 8,   "reorder_point": 10, "supplier_id": 1},
        {"sku": "SKU-005", "name": "Mechanical Keyboard",  "category": "Electronics", "price": 129.99, "quantity": 40,  "reorder_point": 10, "supplier_id": 2},
        {"sku": "SKU-006", "name": "Webcam HD 1080p",      "category": "Electronics", "price": 79.99,  "quantity": 3,   "reorder_point": 10, "supplier_id": 1},
        {"sku": "SKU-007", "name": "Desk Lamp LED",        "category": "Office",      "price": 39.99,  "quantity": 60,  "reorder_point": 20, "supplier_id": 2},
        {"sku": "SKU-008", "name": "Notepad A4 Pack",      "category": "Stationery",  "price": 9.99,   "quantity": 200, "reorder_point": 50, "supplier_id": 2},
    ],
    "transactions": [
        {"transaction_id": 1, "sku": "SKU-001", "user_id": 3, "type": "Sale",     "quantity": 2,  "date": "2025-05-01"},
        {"transaction_id": 2, "sku": "SKU-002", "user_id": 3, "type": "Sale",     "quantity": 5,  "date": "2025-05-01"},
        {"transaction_id": 3, "sku": "SKU-003", "user_id": 2, "type": "Purchase", "quantity": 50, "date": "2025-05-02"},
        {"transaction_id": 4, "sku": "SKU-004", "user_id": 3, "type": "Sale",     "quantity": 1,  "date": "2025-05-03"},
        {"transaction_id": 5, "sku": "SKU-006", "user_id": 3, "type": "Sale",     "quantity": 3,  "date": "2025-05-04"},
    ],
    "_counters": {"user_id": 3, "supplier_id": 2, "transaction_id": 5}
}

# ── Minimal JWT (no external lib dependency) ──────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "sms-super-secret-key-change-in-prod")
JWT_EXPIRY  = 3600 * 8  # 8 hours

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * padding)

def create_token(user_id: int, username: str, role: str) -> str:
    header  = _b64url_encode(json.dumps({"alg":"HS256","typ":"JWT"}).encode())
    payload = _b64url_encode(json.dumps({
        "user_id": user_id, "username": username, "role": role,
        "exp": int(time.time()) + JWT_EXPIRY
    }).encode())
    sig = _b64url_encode(hmac.new(JWT_SECRET.encode(), f"{header}.{payload}".encode(),
                                   hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"

def verify_token(token: str) -> dict | None:
    try:
        header, payload, sig = token.split(".")
        expected = _b64url_encode(hmac.new(JWT_SECRET.encode(),
                                            f"{header}.{payload}".encode(),
                                            hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(_b64url_decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None

# ── Flask app ─────────────────────────────────────────────────────────────────
import os
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = Flask(__name__, static_folder=os.path.join(BASE,"static"), template_folder=os.path.join(BASE,"templates"))
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Auth middleware ───────────────────────────────────────────────────────────
def require_auth(*roles):
    """Decorator: @require_auth()  or  @require_auth('Admin','Manager')"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return jsonify({"error": "Missing token"}), 401
            claims = verify_token(auth[7:])
            if not claims:
                return jsonify({"error": "Invalid or expired token"}), 401
            if roles and claims["role"] not in roles:
                return jsonify({"error": "Forbidden"}), 403
            request.user = claims
            return fn(*args, **kwargs)
        return wrapper
    return decorator

# ── Helpers ───────────────────────────────────────────────────────────────────
def next_id(key):
    DB["_counters"][key] += 1
    return DB["_counters"][key]

def find(collection, **kwargs):
    for item in DB[collection]:
        if all(item.get(k) == v for k, v in kwargs.items()):
            return item
    return None

# ── AUTH ROUTES ───────────────────────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    user = find("users", username=username)
    if not user or not _check_pw(password, user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401
    token = create_token(user["user_id"], user["username"], user["role"])
    return jsonify({"token": token, "username": user["username"], "role": user["role"]})

@app.route("/api/auth/me", methods=["GET"])
@require_auth()
def me():
    return jsonify(request.user)

# ── DASHBOARD ─────────────────────────────────────────────────────────────────
@app.route("/api/dashboard", methods=["GET"])
@require_auth()
def dashboard():
    products     = DB["products"]
    transactions = DB["transactions"]
    total        = len(products)
    out_of_stock = sum(1 for p in products if p["quantity"] == 0)
    low_stock    = sum(1 for p in products if 0 < p["quantity"] <= p["reorder_point"])
    today        = str(date.today())
    today_sales  = sum(t["quantity"] for t in transactions if t["type"] == "Sale" and t["date"] == today)
    today_revenue= sum(
        t["quantity"] * next((p["price"] for p in products if p["sku"] == t["sku"]), 0)
        for t in transactions if t["type"] == "Sale" and t["date"] == today
    )
    recent = sorted(transactions, key=lambda x: x["transaction_id"], reverse=True)[:8]
    enriched = []
    for t in recent:
        p = find("products", sku=t["sku"])
        u = find("users", user_id=t["user_id"])
        enriched.append({**t, "product_name": p["name"] if p else "–",
                          "username": u["username"] if u else "–"})
    low_items = [p for p in products if 0 < p["quantity"] <= p["reorder_point"]]
    return jsonify({
        "total_products":  total,
        "out_of_stock":    out_of_stock,
        "low_stock":       low_stock,
        "today_sales_qty": today_sales,
        "today_revenue":   round(today_revenue, 2),
        "recent_transactions": enriched,
        "low_stock_items": low_items,
    })

# ── PRODUCTS ──────────────────────────────────────────────────────────────────
@app.route("/api/products", methods=["GET"])
@require_auth()
def get_products():
    prods = DB["products"]
    q     = request.args.get("q", "").lower()
    cat   = request.args.get("category", "")
    if q:
        prods = [p for p in prods if q in p["sku"].lower() or q in p["name"].lower()]
    if cat:
        prods = [p for p in prods if p["category"] == cat]
    # enrich with supplier name
    result = []
    for p in prods:
        sup = find("suppliers", supplier_id=p["supplier_id"])
        result.append({**p, "supplier_name": sup["supplier_name"] if sup else "–",
                        "low_stock": p["quantity"] <= p["reorder_point"]})
    return jsonify(result)

@app.route("/api/products", methods=["POST"])
@require_auth("Admin", "Manager")
def create_product():
    d = request.json or {}
    required = ["sku","name","price","quantity","reorder_point"]
    if any(k not in d for k in required):
        return jsonify({"error": f"Required: {required}"}), 400
    if find("products", sku=d["sku"]):
        return jsonify({"error": "SKU already exists"}), 409
    product = {
        "sku":           d["sku"].strip().upper(),
        "name":          d["name"].strip(),
        "category":      d.get("category", "General"),
        "price":         float(d["price"]),
        "quantity":      int(d["quantity"]),
        "reorder_point": int(d["reorder_point"]),
        "supplier_id":   d.get("supplier_id"),
    }
    DB["products"].append(product)
    return jsonify(product), 201

@app.route("/api/products/<sku>", methods=["PUT"])
@require_auth("Admin", "Manager")
def update_product(sku):
    product = find("products", sku=sku)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    d = request.json or {}
    for k in ["name","category","price","quantity","reorder_point","supplier_id"]:
        if k in d:
            product[k] = type(product.get(k, ""))(d[k]) if k not in ("name","category") else d[k]
    if "price" in d:        product["price"]         = float(d["price"])
    if "quantity" in d:     product["quantity"]       = int(d["quantity"])
    if "reorder_point" in d:product["reorder_point"]  = int(d["reorder_point"])
    return jsonify(product)

@app.route("/api/products/<sku>", methods=["DELETE"])
@require_auth("Admin")
def delete_product(sku):
    product = find("products", sku=sku)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    DB["products"] = [p for p in DB["products"] if p["sku"] != sku]
    return jsonify({"message": "Product deleted"})

@app.route("/api/products/categories", methods=["GET"])
@require_auth()
def get_categories():
    cats = sorted(set(p["category"] for p in DB["products"] if p["category"]))
    return jsonify(cats)

# ── SUPPLIERS ─────────────────────────────────────────────────────────────────
@app.route("/api/suppliers", methods=["GET"])
@require_auth()
def get_suppliers():
    return jsonify(DB["suppliers"])

@app.route("/api/suppliers", methods=["POST"])
@require_auth("Admin", "Manager")
def create_supplier():
    d = request.json or {}
    if not d.get("supplier_name"):
        return jsonify({"error": "supplier_name required"}), 400
    supplier = {
        "supplier_id":   next_id("supplier_id"),
        "supplier_name": d["supplier_name"].strip(),
        "contact_info":  d.get("contact_info", ""),
        "address":       d.get("address", ""),
    }
    DB["suppliers"].append(supplier)
    return jsonify(supplier), 201

@app.route("/api/suppliers/<int:sid>", methods=["PUT"])
@require_auth("Admin", "Manager")
def update_supplier(sid):
    supplier = find("suppliers", supplier_id=sid)
    if not supplier:
        return jsonify({"error": "Supplier not found"}), 404
    d = request.json or {}
    for k in ["supplier_name","contact_info","address"]:
        if k in d:
            supplier[k] = d[k]
    return jsonify(supplier)

@app.route("/api/suppliers/<int:sid>", methods=["DELETE"])
@require_auth("Admin")
def delete_supplier(sid):
    supplier = find("suppliers", supplier_id=sid)
    if not supplier:
        return jsonify({"error": "Supplier not found"}), 404
    DB["suppliers"] = [s for s in DB["suppliers"] if s["supplier_id"] != sid]
    return jsonify({"message": "Supplier deleted"})

# ── TRANSACTIONS ──────────────────────────────────────────────────────────────
@app.route("/api/transactions", methods=["GET"])
@require_auth()
def get_transactions():
    txns = DB["transactions"]
    # filters
    t_type = request.args.get("type")
    date_from = request.args.get("from")
    date_to   = request.args.get("to")
    if t_type:    txns = [t for t in txns if t["type"] == t_type]
    if date_from: txns = [t for t in txns if t["date"] >= date_from]
    if date_to:   txns = [t for t in txns if t["date"] <= date_to]
    txns = sorted(txns, key=lambda x: x["transaction_id"], reverse=True)
    enriched = []
    for t in txns:
        p = find("products", sku=t["sku"])
        u = find("users", user_id=t["user_id"])
        enriched.append({
            **t,
            "product_name": p["name"] if p else "–",
            "unit_price":   p["price"] if p else 0,
            "total_value":  round(t["quantity"] * (p["price"] if p else 0), 2),
            "username":     u["username"] if u else "–",
        })
    return jsonify(enriched)

@app.route("/api/transactions", methods=["POST"])
@require_auth()
def create_transaction():
    d = request.json or {}
    required = ["sku","type","quantity","date"]
    if any(k not in d for k in required):
        return jsonify({"error": f"Required: {required}"}), 400
    product = find("products", sku=d["sku"])
    if not product:
        return jsonify({"error": "Product not found"}), 404
    qty = int(d["quantity"])
    if qty <= 0:
        return jsonify({"error": "Quantity must be positive"}), 400
    t_type = d["type"]
    if t_type not in ("Sale","Purchase"):
        return jsonify({"error": "type must be Sale or Purchase"}), 400
    # update stock
    if t_type == "Sale":
        if product["quantity"] < qty:
            return jsonify({"error": f"Insufficient stock. Available: {product['quantity']}"}), 400
        product["quantity"] -= qty
    else:
        product["quantity"] += qty
    txn = {
        "transaction_id": next_id("transaction_id"),
        "sku":      d["sku"],
        "user_id":  request.user["user_id"],
        "type":     t_type,
        "quantity": qty,
        "date":     d["date"],
    }
    DB["transactions"].append(txn)
    alert = product["quantity"] <= product["reorder_point"]
    return jsonify({**txn, "low_stock_alert": alert, "new_quantity": product["quantity"]}), 201

@app.route("/api/transactions/<int:tid>", methods=["DELETE"])
@require_auth("Admin")
def delete_transaction(tid):
    txn = find("transactions", transaction_id=tid)
    if not txn:
        return jsonify({"error": "Transaction not found"}), 404
    DB["transactions"] = [t for t in DB["transactions"] if t["transaction_id"] != tid]
    return jsonify({"message": "Transaction deleted"})

# ── REPORTS ───────────────────────────────────────────────────────────────────
@app.route("/api/reports/sales", methods=["GET"])
@require_auth("Admin", "Manager")
def report_sales():
    date_from = request.args.get("from", str(date.today()))
    date_to   = request.args.get("to",   str(date.today()))
    txns = [t for t in DB["transactions"]
            if t["type"] == "Sale" and date_from <= t["date"] <= date_to]
    rows = []
    total_revenue = 0
    for t in sorted(txns, key=lambda x: x["date"]):
        p = find("products", sku=t["sku"])
        u = find("users", user_id=t["user_id"])
        unit = p["price"] if p else 0
        total = round(t["quantity"] * unit, 2)
        total_revenue += total
        rows.append({**t, "product_name": p["name"] if p else "–",
                     "unit_price": unit, "total_value": total,
                     "username": u["username"] if u else "–"})
    return jsonify({"from": date_from, "to": date_to,
                    "rows": rows, "total_revenue": round(total_revenue, 2),
                    "total_items_sold": sum(r["quantity"] for r in rows)})

@app.route("/api/reports/stock", methods=["GET"])
@require_auth()
def report_stock():
    rows = []
    for p in DB["products"]:
        sup = find("suppliers", supplier_id=p["supplier_id"])
        status = "Out of Stock" if p["quantity"] == 0 else (
                 "Low Stock" if p["quantity"] <= p["reorder_point"] else "OK")
        rows.append({**p, "supplier_name": sup["supplier_name"] if sup else "–",
                     "stock_value": round(p["price"] * p["quantity"], 2),
                     "status": status})
    total_value = sum(r["stock_value"] for r in rows)
    return jsonify({"rows": rows, "total_stock_value": round(total_value, 2),
                    "generated_at": str(date.today())})

# ── USERS (Admin only) ────────────────────────────────────────────────────────
@app.route("/api/users", methods=["GET"])
@require_auth("Admin")
def get_users():
    return jsonify([{k: v for k, v in u.items() if k != "password"}
                    for u in DB["users"]])

@app.route("/api/users", methods=["POST"])
@require_auth("Admin")
def create_user():
    d = request.json or {}
    if not d.get("username") or not d.get("password"):
        return jsonify({"error": "username and password required"}), 400
    if find("users", username=d["username"]):
        return jsonify({"error": "Username already exists"}), 409
    user = {
        "user_id":  next_id("user_id"),
        "username": d["username"].strip(),
        "password": _hash_pw(d["password"]),
        "role":     d.get("role", "Staff"),
    }
    DB["users"].append(user)
    return jsonify({k: v for k, v in user.items() if k != "password"}), 201

# ── Static files / SPA ───────────────────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    static_file = os.path.join(app.static_folder, path)
    if path and os.path.exists(static_file):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.template_folder, "index.html")

if __name__ == "__main__":
    print("="*55)
    print("  Stock Maintenance System (SMS) — Backend")
    print("  http://localhost:5000")
    print("  Accounts: admin/admin123  manager1/manager123  staff1/staff123")
    print("="*55)
    app.run(debug=True, host="0.0.0.0", port=5000)
