📊 Fuzzy Logic-Based Loan Eligibility System


📌 Overview

This project is a web-based loan eligibility prediction system built using Flask and MySQL, integrating fuzzy logic (Mamdani inference model) to provide intelligent and human-like decision-making.

Unlike traditional binary systems, this application evaluates multiple financial and personal factors to generate a dynamic approval score (0–100), offering more flexible and realistic results.


🧠 Key Concept: Fuzzy Logic

The system uses fuzzy logic to handle uncertainty and approximate reasoning. Inputs are converted into linguistic variables (low, medium, high), processed using rule-based inference, and finally converted into a crisp output using the centroid defuzzification method.


⚙️ Features

🔐 User authentication (Login / Signup)

👤 Role-based access (Admin & User)

📈 Loan eligibility prediction using fuzzy logic

📊 Approval score with decision (Approved / Review / Rejected)

🧾 Loan history tracking

📉 Analytics dashboard with fuzzy membership visualizations

🧑‍💼 Admin panel to manage users


🧩 Input Parameters

The system evaluates the following factors:

Income

Credit Score

Debt Ratio

Employment History

Existing Loans

Age


🔄 System Workflow

User enters financial details

Inputs are fuzzified using membership functions

Fuzzy rules are applied using Mamdani inference

Results are aggregated

Final output is obtained using centroid defuzzification

System displays approval score and decision


🛠️ Technology Stack

Backend: Flask (Python)

Database: MySQL

Fuzzy Logic: scikit-fuzzy

Frontend: HTML, CSS, Bootstrap

Visualization: Matplotlib


🗄️ Database Design

Users Table: Stores user credentials and roles

Loans Table: Stores loan inputs and approval results


📊 Output

Approval Score (0–100)

Decision Category:

✅ Approved

⚠️ Review Required

❌ Rejected

Reasoning based on input conditions


🎯 Advantages

Handles uncertainty effectively

Mimics real-world decision-making

Provides flexible and interpretable results

More realistic than traditional rule-based systems


⚠️ Limitations

Rule-based system may require tuning

Performance depends on membership design

Limited to predefined rules


🚀 Future Scope

Integration with machine learning models

Real-time banking data integration

Advanced analytics and reporting

Deployment on cloud platforms


🧪 Setup Instructions

git clone <your-repo-link>
cd project-folder
pip install -r requirements.txt
python app.py


🎓 Conclusion

This project demonstrates how fuzzy logic can be effectively applied in financial decision systems to provide intelligent, flexible, and human-like loan approval predictions.
