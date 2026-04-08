console.log("SMART FUZZY LOADED");

// ================= Sliders Setup =================
const sliders = [
    ['income','income_val',200000],
    ['credit_score','credit_val',850],
    ['debt_ratio','debt_val',1],
    ['employment','emp_val',40],
    ['existing_loans','loan_val',10],
    ['age','age_val',80]
];

sliders.forEach(([id, display, maxVal]) => {
    const input = document.getElementById(id);
    const output = document.getElementById(display);
    if(input && output){
        input.max = maxVal;
        input.oninput = () => {
            output.innerText = input.value;
            updateDashboard();
        };
        output.innerText = input.value;
    }
});

// ================= Charts Setup =================
const gaugeCtx = document.getElementById('approvalGauge').getContext('2d');
let approvalGauge = new Chart(gaugeCtx, {
    type: 'doughnut',
    data: { labels:['Approved','Remaining'], datasets:[{data:[0,100], backgroundColor:['#1ab394','#e0e0e0'], borderWidth:0}] },
    options:{ circumference:180, rotation:270, cutout:'70%', plugins:{legend:{display:false}, tooltip:{enabled:false}} }
});

const fuzzyCtx = document.getElementById('fuzzyGraph').getContext('2d');
let fuzzyGraph = new Chart(fuzzyCtx, {
    type:'bar',
    data:{
        labels:['Income','Credit','Debt','Employment','Loans','Age'],
        datasets:[{label:'Membership Degree', data:[0,0,0,0,0,0], backgroundColor:'#1ab394'}]
    },
    options:{ responsive:true, scales:{ y:{min:0,max:1} }, plugins:{tooltip:{enabled:true,callbacks:{label:ctx=>`${ctx.label}: ${(ctx.raw*100).toFixed(2)}%`}}}}
});

// ================= Bank-Style Fuzzy Membership Functions =================
function fuzzifyIncome(i){ 
    return {
        low: Math.max(0, Math.min(1, (50000 - i)/20000)),       // <50k strongly low
        medium: Math.max(0, Math.min((i - 45000)/25000, (100000 - i)/25000)), // 45k-100k
        high: Math.max(0, Math.min(1, (i - 90000)/10000))       // >90k strongly high
    }; 
}

function fuzzifyCredit(c){ 
    return {
        low: Math.max(0, Math.min(1, (620 - c)/40)),            // <620 risky
        medium: Math.max(0, Math.min((c - 610)/50, (740 - c)/50)), // 610–740
        high: Math.max(0, Math.min(1, (c - 740)/20))            // >740 excellent
    }; 
}

function fuzzifyDebt(d){ 
    return {
        low: Math.max(0, 1 - d/0.25),                           // <0.25 strongly good
        medium: Math.max(0, Math.min((d - 0.2)/0.2, (0.5 - d)/0.2)), // 0.2–0.5
        high: Math.max(0, d/0.5)                                // >0.5 risky
    }; 
}

function fuzzifyEmployment(e){ 
    return {
        low: Math.max(0, Math.min(1,(3 - e)/3)),               // <3 yrs unstable
        medium: Math.max(0, Math.min((e - 3)/5, (10 - e)/5)),  // 3–10 yrs
        high: Math.max(0, Math.min(1,(e - 8)/7))               // >8 yrs stable
    }; 
}

function fuzzifyLoans(l){ 
    return {
        low: Math.max(0, Math.min(1,(1 - l)/1)),               // 0–1 loan is good
        medium: Math.max(0, Math.min((l - 1)/2, (3 - l)/2)),   // 1–3 loans
        high: Math.max(0, Math.min(1,(l - 2)/2))               // >2 loans risky
    }; 
}

function fuzzifyAge(a){ 
    return {
        young: Math.max(0, Math.min(1,(28 - a)/10)),           // <28 young
        ideal: Math.max(0, Math.min((a - 25)/10, (50 - a)/10)), // 25–50 ideal
        old: Math.max(0, Math.min(1,(a - 50)/15))              // >50 old
    }; 
}

// ================= Fuzzy Rules & Scoring (Bank-Style) =================
function updateDashboard() {
    const income = +document.getElementById('income').value;
    const credit = +document.getElementById('credit_score').value;
    const debt = +document.getElementById('debt_ratio').value;
    const employment = +document.getElementById('employment').value;
    const loans = +document.getElementById('existing_loans').value;
    const age = +document.getElementById('age').value;

    // ===== Fuzzify Inputs =====
    const incomeF = fuzzifyIncome(income);
    const creditF = fuzzifyCredit(credit);
    const debtF = fuzzifyDebt(debt);
    const empF = fuzzifyEmployment(employment);
    const loansF = fuzzifyLoans(loans);
    const ageF = fuzzifyAge(age);

    // ===== Bank-Style Rules =====
    // Using weighted OR/AND logic (max/min) for realistic approval
    const ruleHighIncomeGoodCredit = Math.min(incomeF.high, creditF.high, debtF.low); // Strong applicant
    const ruleMediumIncomeGoodCredit = Math.min(incomeF.medium, creditF.medium, debtF.low);
    const ruleStableJob = Math.min(empF.high, ageF.ideal, loansF.low);               // Supporting factors
    const ruleMediumDebt = Math.min(incomeF.high, creditF.medium, debtF.medium);     // Medium risk
    const ruleHighDebtOrPoorCredit = Math.max(debtF.high, creditF.low);             // Risky applicant

    // ===== Weighted Scoring =====
    const totalScore = 
          ruleHighIncomeGoodCredit * 50 +  // 50% weight
          ruleMediumIncomeGoodCredit * 25 + // 25% weight
          ruleStableJob * 15 +              // 15% weight
          ruleMediumDebt * 5 +              // 5% weight
          ruleHighDebtOrPoorCredit * 5;     // 5% penalty

    const approval = Math.min(totalScore, 100);

    // ===== Decision & Reasons =====
    const decision = approval >= 60 ? "Approved" : (approval >= 35 ? "Maybe" : "Denied");
    const reasons = [];
    if (incomeF.high > 0.5) reasons.push("High income (+)");
    else if (incomeF.low > 0.5) reasons.push("Low income (-)");

    if (creditF.high > 0.5) reasons.push("Excellent credit (+)");
    else if (creditF.low > 0.5) reasons.push("Poor credit (-)");

    if (debtF.low > 0.5) reasons.push("Low debt (+)");
    else if (debtF.high > 0.5) reasons.push("High debt (-)");

    if (empF.high > 0.5) reasons.push("Stable job (+)");
    else if (empF.low > 0.5) reasons.push("Unstable job (-)");

    if (loansF.high > 0.5) reasons.push("Too many loans (-)");
    else if (loansF.low > 0.5) reasons.push("No existing loans (+)");

    if (ageF.ideal > 0.5) reasons.push("Ideal age (+)");
    else if (ageF.young > 0.5 || ageF.old > 0.5) reasons.push("Risky age (-)");

    // ===== Gauge & Graph Colors =====
    let gaugeColor, barColor;
    if (approval >= 60) { gaugeColor = ['#1ab394','#e0e0e0']; barColor = '#1ab394'; }
    else if (approval >= 35) { gaugeColor = ['#f0ad4e','#e0e0e0']; barColor = '#f0ad4e'; }
    else { gaugeColor = ['#d9534f','#e0e0e0']; barColor = '#d9534f'; }

    approvalGauge.data.datasets[0].data = [approval, 100 - approval];
    approvalGauge.data.datasets[0].backgroundColor = gaugeColor;
    approvalGauge.update({duration:500,easing:'easeOutCubic'});

    fuzzyGraph.data.datasets[0].data = [
        incomeF.high, creditF.high, debtF.low, empF.high, loansF.low, ageF.ideal
    ];
    fuzzyGraph.data.datasets[0].backgroundColor = [barColor, barColor, barColor, barColor, barColor, barColor];
    fuzzyGraph.update({duration:500,easing:'easeOutCubic'});

    const resultEl = document.getElementById('result');
    resultEl.innerHTML = `
        <div class="result-box animate">
            <h3 style="color:${barColor}">${decision}</h3>
            <p>Score: ${approval.toFixed(2)}</p>
            <p>${reasons.join(", ")}</p>
        </div>
    `;
}

// ================= Form Submission =================
function checkApproval(formId,resultId){
    const form=document.getElementById(formId);
    form.addEventListener('submit',e=>{
        e.preventDefault();
        const resultEl=document.getElementById(resultId);
        resultEl.innerHTML="⏳ Processing...";
        resultEl.classList.add("loading");
        setTimeout(()=>{
            updateDashboard();
            resultEl.classList.remove("loading");
        },500);
    });
}

// ================= Dark Mode =================
const darkToggle=document.getElementById('darkModeToggle');
if(darkToggle){
    darkToggle.addEventListener('click',()=>{
        document.body.classList.toggle('dark-mode');
        approvalGauge.data.datasets[0].backgroundColor=document.body.classList.contains('dark-mode')?['#18a689','#555']:['#1ab394','#e0e0e0'];
        approvalGauge.update();
        fuzzyGraph.data.datasets[0].backgroundColor=document.body.classList.contains('dark-mode')?'#18a689':'#1ab394';
        fuzzyGraph.update();
    });
}

// ================= Initialize =================
document.addEventListener('DOMContentLoaded', () => {
    checkApproval('loanForm','result');
    updateDashboard();
});