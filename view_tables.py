import sqlite3

# Connect to your database
conn = sqlite3.connect('fuzzy.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables in fuzzy.db:")
for table in tables:
    print(table['name'])

# View users table
print("\nUsers table:")
for row in cursor.execute("SELECT * FROM users"):
    print(dict(row))

# View loans table
print("\nLoans table:")
for row in cursor.execute("SELECT * FROM loans"):
    print(dict(row))

conn.close()