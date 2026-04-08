import sqlite3
from werkzeug.security import generate_password_hash

# Connect (creates the file if it doesn't exist)
conn = sqlite3.connect('fuzzy.db')
cursor = conn.cursor()

# Enable foreign key support
cursor.execute("PRAGMA foreign_keys = ON;")

# Create users table with role
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
)
""")

# Create loans table
cursor.execute("""
CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    income REAL NOT NULL,
    credit_score REAL NOT NULL,
    debt_ratio REAL NOT NULL,
    approval REAL NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)
""")

# Optional: Insert an admin user
admin_name = "Admin"
admin_email = "admin@example.com"
admin_password = generate_password_hash("admin123")  # hash your password
admin_role = "admin"

# Insert admin only if not exists
cursor.execute("SELECT * FROM users WHERE email = ?", (admin_email,))
if not cursor.fetchone():
    cursor.execute(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        (admin_name, admin_email, admin_password, admin_role)
    )

conn.commit()
conn.close()

print("Database and tables created successfully with admin user!")