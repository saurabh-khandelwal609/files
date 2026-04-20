# 📦 Stock Maintenance System (SMS)

A complete web-based inventory management application.

## Tech Stack
- **Backend**: Python 3.10+ / Flask
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no framework needed)
- **Database**: MySQL (in-memory dict for demo; swap with MySQL easily)
- **Auth**: Custom JWT + BCrypt

## Quick Start

### 1. Install dependencies
```bash
pip install flask flask-cors bcrypt
```

### 2. Run the server
```bash
cd sms/backend
python app.py
```

### 3. Open in browser
```
http://localhost:5000
```

## Demo Accounts
| Role    | Username   | Password     |
|---------|------------|--------------|
| Admin   | admin      | admin123     |
| Manager | manager1   | manager123   |
| Staff   | staff1     | staff123     |

## Project Structure
```
sms/
├── backend/
│   └── app.py              ← Flask backend (all API routes)
├── static/
│   ├── css/style.css       ← Responsive CSS
│   └── js/
│       ├── api.js          ← Fetch + JWT wrapper
│       ├── app.js          ← Router, toast, modal, init
│       ├── auth.js         ← Login / logout
│       ├── dashboard.js    ← Dashboard KPIs
│       ├── products.js     ← Products CRUD
│       ├── transactions.js ← Transactions
│       ├── suppliers.js    ← Suppliers
│       ├── reports.js      ← Reports + CSV export
│       └── users.js        ← User management (Admin)
├── templates/
│   └── index.html          ← SPA shell
├── schema.sql              ← MySQL DDL (for production)
└── README.md
```

## MySQL Production Setup
1. Run `schema.sql` against your MySQL instance
2. In `app.py`, replace the in-memory `DB` dict with `mysql-connector-python` queries
3. Set environment variable `JWT_SECRET` to a strong random string

## Features
- ✅ Role-Based Access Control (Admin / Manager / Staff)
- ✅ Product CRUD with low-stock detection
- ✅ Auto stock update on Sale/Purchase
- ✅ Low stock alerts on dashboard
- ✅ Supplier management
- ✅ Sales + Stock-on-Hand reports with CSV export
- ✅ Fully responsive (mobile + desktop)
- ✅ JWT authentication
- ✅ BCrypt password hashing
