const axios = require('axios');

async function test() {
    const res = await axios.post('http://localhost:5000/predict', {
        income: 85000,
        credit_score: 780,
        debt_ratio: 0.1
    });

    console.log(res.data);
}

test();
