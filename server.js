const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());
app.use(express.static('public')); // Thư mục chứa giao diện web

// 1. Kết nối Database PostgreSQL trên Cloud
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 2. Tự động tạo bảng lịch sử nếu chưa có
pool.query(`
    CREATE TABLE IF NOT EXISTS math_history (
        id SERIAL PRIMARY KEY,
        equation VARCHAR(255),
        result VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

// 3. API 1: Trả về danh sách lịch sử tính toán (Định dạng JSON)
app.get('/api/history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM math_history ORDER BY id DESC LIMIT 20');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi kết nối database" });
    }
});

// 4. API 2: Nhận tham số, giải toán và lưu Database
app.post('/api/solve', async (req, res) => {
    const a = parseFloat(req.body.a);
    const b = parseFloat(req.body.b);
    const c = parseFloat(req.body.c);
    
    let equationStr = `${a}x² + ${b}x + ${c} = 0`;
    let resultStr = "";

    // Thuật toán giải phương trình
    if (a === 0) {
        if (b === 0) {
            resultStr = (c === 0) ? "Vô số nghiệm" : "Vô nghiệm";
        } else {
            resultStr = `x = ${(-c / b).toFixed(2)}`;
        }
    } else {
        let delta = b * b - 4 * a * c;
        if (delta < 0) {
            resultStr = "Vô nghiệm";
        } else if (delta === 0) {
            resultStr = `Nghiệm kép x1 = x2 = ${(-b / (2 * a)).toFixed(2)}`;
        } else {
            let x1 = (-b + Math.sqrt(delta)) / (2 * a);
            let x2 = (-b - Math.sqrt(delta)) / (2 * a);
            resultStr = `x1 = ${x1.toFixed(2)}, x2 = ${x2.toFixed(2)}`;
        }
    }

    // Lưu vào Database
    try {
        await pool.query('INSERT INTO math_history (equation, result) VALUES ($1, $2)', [equationStr, resultStr]);
        res.json({ equation: equationStr, result: resultStr });
    } catch (err) {
        res.status(500).json({ error: "Lỗi lưu database" });
    }
});

// 5. Khởi chạy Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Máy tính Đám mây đang chạy tại port ${PORT}`));