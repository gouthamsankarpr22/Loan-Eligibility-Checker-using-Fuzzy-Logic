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

// ================= Fuzzy Membership Functions =================
function fuzzifyIncome(i){ 
    return { low: Math.max(0,Math.min(1,(70000-i)/30000)), 
             medium: Math.max(0,Math.min((i-40000)/30000,(100000-i)/30000)), 
             high: Math.max(0,Math.min(1,(i-90000)/100000 + 0.1)) }; 
}
function fuzzifyCredit(c){ 
    return { low: Math.max(0,Math.min(1,(650-c)/150)), 
             medium: Math.max(0,Math.min((c-600)/100,(750-c)/100 + 0.5)), 
             high: Math.max(0,Math.min(1,(c-750)/100)) }; 
}
function fuzzifyDebt(d){ 
    return { low: Math.max(0, 1-d/0.5), 
             medium: Math.max(0, Math.min((d-0.2)/0.3,(0.7-d)/0.3)), 
             high: Math.max(0, d/0.5) }; 
}
function fuzzifyEmployment(e){ 
    return { low: Math.max(0, Math.min(1,(5-e)/5)), 
             medium: Math.max(0, Math.min((10-e)/5,(20-e)/10)), 
             high: Math.max(0, Math.min(1,(e-15)/20)) }; 
}
function fuzzifyLoans(l){ 
    return { low: Math.max(0, Math.min(1,(2-l)/2)), 
             medium: Math.max(0, Math.min((3-l)/2,(5-l)/2)), 
             high: Math.max(0, Math.min(1,(l-5)/5)) }; 
}
function fuzzifyAge(a){ 
    return { young: Math.max(0, Math.min(1,(30-a)/15)), 
             ideal: Math.max(0, Math.min((40-a)/10,(50-a)/10 + 0.5)), 
             old: Math.max(0, Math.min(1,(a-50)/20)) }; 
}

// ================= Fuzzy Inference =================
function fuzzyInference(i,c,d,e,l,a){
    const incomeF=fuzzifyIncome(i), creditF=fuzzifyCredit(c), debtF=fuzzifyDebt(d), empF=fuzzifyEmployment(e), loansF=fuzzifyLoans(l), ageF=fuzzifyAge(a);
    
    const rules=[
        {weight:0.25, strength: Math.min(incomeF.high, creditF.high, debtF.low, empF.high, loansF.low, ageF.ideal)},  // Strong approval
        {weight:0.2, strength: Math.min(incomeF.medium, creditF.medium, debtF.low, empF.medium, loansF.low, ageF.ideal)}, // Medium approval
        {weight:0.15, strength: Math.min(incomeF.high, creditF.medium, debtF.medium, empF.medium, loansF.medium, ageF.ideal)}, // Balanced
        {weight:0.1, strength: Math.min(incomeF.medium, creditF.medium, debtF.medium, empF.medium, loansF.medium, ageF.old)}, // Risk
        {weight:0.3, strength: Math.max(incomeF.low, creditF.low, debtF.high, empF.low, loansF.high, ageF.old)} // Deny
    ];
    
    let totalScore = 0, totalWeight = 0;
    rules.forEach(r => { totalScore += r.strength*100*r.weight; totalWeight += r.weight; });
    return Math.min(totalScore/totalWeight, 100);
}

// ================= Fuzzy Graph Update =================
function updateFuzzyGraph(fuzzyValues){
    const colors=fuzzyValues.map(v=>v>=0.7?'green':v>=0.4?'orange':'red');
    fuzzyGraph.data.datasets[0].data=fuzzyValues;
    fuzzyGraph.data.datasets[0].backgroundColor=colors;
    fuzzyGraph.update({duration:500,easing:'easeOutCubic'});
}

// ================= Dashboard Update =================
function updateDashboard(){
    const income = +document.getElementById('income').value;
    const credit = +document.getElementById('credit_score').value;
    const debt = +document.getElementById('debt_ratio').value;
    const employment = +document.getElementById('employment').value;
    const loans = +document.getElementById('existing_loans').value;
    const age = +document.getElementById('age').value;

    // ===== Fuzzify Inputs =====
    const incomeF = { low: Math.max(0,(100000-income)/50000), medium: Math.max(0,Math.min((income-50000)/40000,(120000-income)/20000)), high: Math.max(0,(income-100000)/50000) };
    const creditF = { low: Math.max(0,(650-credit)/100), medium: Math.max(0,Math.min((credit-600)/100,(750-credit)/100)), high: Math.max(0,(credit-740)/60) };
    const debtF = { low: Math.max(0,1-debt/0.5), medium: Math.max(0,Math.min((debt-0.2)/0.3,(0.6-debt)/0.3)), high: Math.max(0,debt/0.5) };
    const empF = { low: Math.max(0,(5-employment)/5), medium: Math.max(0,Math.min((employment-3)/7,(15-employment)/7)), high: Math.max(0,(employment-12)/8) };
    const loansF = { low: Math.max(0,(2-loans)/2), medium: Math.max(0,Math.min((loans-1)/3,(4-loans)/3)), high: Math.max(0,(loans-3)/3) };
    const ageF = { young: Math.max(0,(32-age)/15), ideal: Math.max(0,Math.min((age-25)/15,(50-age)/15)), old: Math.max(0,(age-48)/20) };

    // ===== Weighted Score Calculation =====
    const approval = Math.min(
        (incomeF.high*0.2 + incomeF.medium*0.15 + creditF.high*0.2 + creditF.medium*0.15 +
        debtF.low*0.15 + empF.high*0.1 + loansF.low*0.05 + ageF.ideal*0.1)*100, 100
    );

    // ===== Decision Thresholds =====
    const decision = approval >= 60 ? "Approved" : (approval >= 25 ? "Maybe" : "Denied");

    const reasons = [];
    if(income>70000) reasons.push("High income (+)"); else if(income<40000) reasons.push("Low income (-)");
    if(credit>750) reasons.push("Excellent credit (+)"); else if(credit<600) reasons.push("Poor credit (-)");
    if(debt<0.3) reasons.push("Low debt (+)"); else if(debt>0.5) reasons.push("High debt (-)");
    if(employment>10) reasons.push("Stable job (+)"); else if(employment<3) reasons.push("Unstable job (-)");
    if(loans===0) reasons.push("No existing loans (+)"); else if(loans>3) reasons.push("Too many loans (-)");
    if(age>=25 && age<=50) reasons.push("Ideal age (+)"); else reasons.push("Risky age (-)");

    const color = approval<35?"red":(approval<60?"orange":"green");

    // ===== Update Result =====
    const resultEl = document.getElementById('result');
    resultEl.innerHTML = `
        <div class="result-box animate">
            <h3 style="color:${color}">${decision}</h3>
            <p>Score: ${approval.toFixed(2)}</p>
            <p>${reasons.join(", ")}</p>
        </div>
    `;

    // ===== Update Gauge =====
    approvalGauge.data.datasets[0].data[0] = approval;
    approvalGauge.data.datasets[0].data[1] = 100 - approval;
    approvalGauge.update({duration:500,easing:'easeOutCubic'});

    // ===== Update Fuzzy Graph =====
    updateFuzzyGraph([incomeF.high, creditF.high, debtF.low, empF.high, loansF.low, ageF.ideal]);
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