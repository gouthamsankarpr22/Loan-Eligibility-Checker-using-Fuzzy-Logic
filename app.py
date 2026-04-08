from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
import mysql.connector
import io
import base64
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import matplotlib.pyplot as plt

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# ----------------- MySQL Database Config -----------------
DATABASE_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1234',
    'database': 'fuzzy_db'
}

# ----------------- Database Helpers -----------------
def get_db_connection():
    conn = mysql.connector.connect(**DATABASE_CONFIG)
    return conn

def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT id, name, email, role FROM users')
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return users

def add_user(name, email, password, role='user'):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)',
            (name, email, password, role)
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

def add_loan(user_id, income, credit_score, debt_ratio, employment, existing_loans, age, approval_score):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            '''INSERT INTO loans 
               (user_id, income, credit_score, debt_ratio, employment, existing_loans, age, approval)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
            (user_id, income, credit_score, debt_ratio, employment, existing_loans, age, approval_score)
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

# ----------------- Auth Decorators -----------------
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') != 'admin':
            flash("Admin access only!", "danger")
            return redirect(url_for('home'))
        return f(*args, **kwargs)
    return decorated_function

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash("Please login first!", "warning")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ----------------- Fuzzy Logic Setup -----------------
income = ctrl.Antecedent(np.arange(0, 100001, 1000), 'income')
credit_score = ctrl.Antecedent(np.arange(300, 851, 1), 'credit_score')
debt_ratio = ctrl.Antecedent(np.arange(0, 1.01, 0.01), 'debt_ratio')
employment = ctrl.Antecedent(np.arange(0, 41, 1), 'employment')
existing_loans = ctrl.Antecedent(np.arange(0, 11, 1), 'existing_loans')
age = ctrl.Antecedent(np.arange(18, 71, 1), 'age')
approval = ctrl.Consequent(np.arange(0, 101, 1), 'approval')

# ----------------- Fuzzy Memberships -----------------
# Income (₹)
income['low'] = fuzz.trapmf(income.universe, [0, 0, 25000, 45000])
income['medium'] = fuzz.trimf(income.universe, [35000, 55000, 75000])
income['high'] = fuzz.trapmf(income.universe, [65000, 80000, 100000, 100000])

# Credit Score
credit_score['very_bad'] = fuzz.trapmf(credit_score.universe, [300, 300, 450, 550])
credit_score['bad'] = fuzz.trimf(credit_score.universe, [500, 600, 700])
credit_score['average'] = fuzz.trimf(credit_score.universe, [650, 720, 780])
credit_score['good'] = fuzz.trimf(credit_score.universe, [750, 800, 840])
credit_score['excellent'] = fuzz.trapmf(credit_score.universe, [820, 840, 850, 850])

# Debt Ratio
debt_ratio['low'] = fuzz.trapmf(debt_ratio.universe, [0, 0, 0.2, 0.35])
debt_ratio['medium'] = fuzz.trimf(debt_ratio.universe, [0.3, 0.5, 0.7])
debt_ratio['high'] = fuzz.trapmf(debt_ratio.universe, [0.65, 0.8, 1.0, 1.0])

employment['short'] = fuzz.trapmf(employment.universe, [0,0,2,5])
employment['moderate'] = fuzz.trimf(employment.universe, [3,7,12])
employment['long'] = fuzz.trapmf(employment.universe, [10,15,40,40])

existing_loans['none'] = fuzz.trimf(existing_loans.universe, [0,0,1])
existing_loans['few'] = fuzz.trimf(existing_loans.universe, [1,2,4])
existing_loans['many'] = fuzz.trimf(existing_loans.universe, [3,6,10])

age['young'] = fuzz.trapmf(age.universe, [18,18,25,30])
age['adult'] = fuzz.trimf(age.universe, [28,40,55])
age['senior'] = fuzz.trapmf(age.universe, [50,60,70,70])

approval['low'] = fuzz.trimf(approval.universe, [0,30,60])
approval['medium'] = fuzz.trimf(approval.universe, [40,60,80])
approval['high'] = fuzz.trimf(approval.universe, [70,100,100])

# ----------------- Fuzzy Rules -----------------
rules = [
    # High approval (strong cases)
    ctrl.Rule(income['high'] & credit_score['excellent'] & debt_ratio['low'], approval['high']),
    ctrl.Rule(income['high'] & credit_score['good'] & debt_ratio['low'], approval['high']),
    ctrl.Rule(income['medium'] & credit_score['excellent'] & debt_ratio['low'], approval['high']),
    ctrl.Rule(income['medium'] & credit_score['good'] & debt_ratio['low'], approval['high']),
    ctrl.Rule(income['high'] & credit_score['average'] & debt_ratio['low'], approval['high']),

    # Medium approval (moderate cases)
    ctrl.Rule(income['medium'] & credit_score['average'] & debt_ratio['medium'], approval['medium']),
    ctrl.Rule(income['high'] & credit_score['good'] & debt_ratio['medium'], approval['medium']),
    ctrl.Rule(income['medium'] & credit_score['good'] & debt_ratio['medium'], approval['medium']),
    ctrl.Rule(income['medium'] & credit_score['excellent'] & debt_ratio['medium'], approval['medium']),
    ctrl.Rule(income['high'] & credit_score['average'] & debt_ratio['medium'], approval['medium']),

    # Low approval (critical cases only)
    ctrl.Rule(income['low'] & credit_score['very_bad'], approval['low']),
    ctrl.Rule(debt_ratio['high'] & credit_score['bad'], approval['low']),
    ctrl.Rule(income['low'] & debt_ratio['high'], approval['low']),
    ctrl.Rule(credit_score['very_bad'] & debt_ratio['high'], approval['low']),
]

loan_ctrl = ctrl.ControlSystem(rules)
loan_sim = ctrl.ControlSystemSimulation(loan_ctrl)

# ----------------- Routes -----------------
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = generate_password_hash(request.form['password'])
        role = request.form.get('role', 'user')
        try:
            add_user(name, email, password, role)
            flash("Account created successfully! Please login.", "success")
            return redirect(url_for('login'))
        except:
            flash("Email already exists!", "danger")
            return redirect(url_for('signup'))
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['user'] = user['name']
            session['role'] = user['role'] if 'role' in user else 'user'
            return redirect(url_for('home'))
        else:
            flash("Invalid email or password", "danger")
            return redirect(url_for('login'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash("Logged out successfully!", "success")
    return redirect(url_for('login'))

@app.route('/')
@login_required
def home():
    return render_template('home.html', active_page='home')

# ----------------- Helper to Plot Fuzzy Membership -----------------
def plot_fuzzy_membership(variable, title):
    fig, ax = plt.subplots(figsize=(5, 3))
    for term_name in variable.terms.keys():
        ax.plot(variable.universe, variable[term_name].mf, label=term_name)
    ax.set_title(title)
    ax.set_xlabel('Value')
    ax.set_ylabel('Membership Degree')
    ax.legend()
    ax.grid(True)
    
    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format='png')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(fig)
    return img_base64

# ----------------- Analytics Route -----------------
# ----------------- Analytics Route -----------------
@app.route('/analytics')
@login_required
def analytics():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    if session.get('role') == 'admin':
        cursor.execute("""
            SELECT l.approval, u.name as user_name
            FROM loans l
            JOIN users u ON l.user_id = u.id
        """)
        loans = cursor.fetchall()
    else:
        cursor.execute("""
            SELECT approval
            FROM loans
            WHERE user_id = %s
        """, (session['user_id'],))
        loans = cursor.fetchall()
    
    cursor.close()
    conn.close()

    analytics_data = {
        "labels": [loan.get('user_name', "You") for loan in loans],
        "scores": [loan['approval'] for loan in loans]
    }

    # Optional: plot fuzzy membership charts
    fuzzy_charts = {
        'Income': plot_fuzzy_membership(income, 'Income Membership Functions'),
        'Credit Score': plot_fuzzy_membership(credit_score, 'Credit Score Membership Functions'),
        'Debt Ratio': plot_fuzzy_membership(debt_ratio, 'Debt Ratio Membership Functions'),
        'Employment': plot_fuzzy_membership(employment, 'Employment History Membership Functions'),
        'Existing Loans': plot_fuzzy_membership(existing_loans, 'Existing Loans Membership Functions'),
        'Age': plot_fuzzy_membership(age, 'Age Membership Functions'),
        'Approval': plot_fuzzy_membership(approval, 'Approval Score Membership Functions')
    }

    return render_template(
        'analytics.html',
        analytics_data=analytics_data,
        fuzzy_charts=fuzzy_charts,
        active_page='analytics'
    )

@app.route('/users')
@login_required
@admin_required
def users_page():
    users_list = get_users()
    return render_template('users.html', users=users_list, active_page='users')

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings_page():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = request.form['password']
        conn = get_db_connection()
        cursor = conn.cursor()
        if password:
            hashed_pw = generate_password_hash(password)
            cursor.execute(
                "UPDATE users SET name=%s, email=%s, password=%s WHERE id=%s",
                (name, email, hashed_pw, session['user_id'])
            )
        else:
            cursor.execute(
                "UPDATE users SET name=%s, email=%s WHERE id=%s",
                (name, email, session['user_id'])
            )
        conn.commit()
        cursor.close()
        conn.close()
        session['user'] = name
        flash("Settings updated successfully!", "success")
        return redirect(url_for('settings_page'))
    return render_template('settings.html', active_page='settings')

@app.route('/predict', methods=['POST'])
@login_required
def predict():
    data = request.get_json()
    loan_sim.input['income'] = data['income']
    loan_sim.input['credit_score'] = data['credit_score']
    loan_sim.input['debt_ratio'] = data['debt_ratio']
    loan_sim.input['employment'] = data['employment']
    loan_sim.input['existing_loans'] = data['existing_loans']
    loan_sim.input['age'] = data['age']
    loan_sim.compute()
    approval_value = float(loan_sim.output['approval'])
    print("Approval:", approval_value)

    reasons = []
    if data['income'] > 70000: reasons.append("High income")
    if 40000 <= data['income'] <= 65000: reasons.append("Moderate income")
    elif data['income'] < 40000: reasons.append("Low income")
    if data['credit_score'] > 750: reasons.append("Excellent credit score")
    if 600 <= data['credit_score'] <= 720: reasons.append("Average credit score")
    elif data['credit_score'] < 600: reasons.append("Poor credit score")
    if data['debt_ratio'] < 0.3: reasons.append("Low debt ratio")
    if 0.35 <= data['debt_ratio'] <= 0.6: reasons.append("Moderate debt ratio")
    elif data['debt_ratio'] > 0.5: reasons.append("High debt ratio")
    if data['employment'] > 10: reasons.append("Long employment history")
    elif data['employment'] < 3: reasons.append("Short employment history")
    if data['existing_loans'] > 3: reasons.append("High existing loan burden")
    if data['age'] < 30: reasons.append("Young applicant")
    elif data['age'] > 55: reasons.append("Senior applicant")

    if approval_value > 60:
        decision = "Approved"
    elif approval_value > 40:
        decision = "Review Required"
    else:
        decision = "Rejected"

    add_loan(
        user_id=session['user_id'],
        income=data['income'],
        credit_score=data['credit_score'],
        debt_ratio=data['debt_ratio'],
        employment=data['employment'],
        existing_loans=data['existing_loans'],
        age=data['age'],
        approval_score=approval_value
    )

    return jsonify({"approval": approval_value, "decision": decision, "reasons": reasons})

if __name__ == '__main__':
    app.run(debug=True)