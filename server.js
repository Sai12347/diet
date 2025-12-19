import express from 'express';
import cors from 'cors';
import { getDb } from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Auth Routes
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const db = await getDb();
        await db.run(
            'INSERT INTO users (email, password, name) VALUES (?, ?, ?)', 
            [email, password, name]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: 'User already exists' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const db = await getDb();
        const user = await db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
        if (user) {
            res.json({ success: true, name: user.name });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

// User Profile Routes
app.get('/api/user', async (req, res) => {
    const email = req.query.email;
    try {
        const db = await getDb();
        const user = await db.get('SELECT profile FROM users WHERE email = ?', [email]);
        res.json(user && user.profile ? JSON.parse(user.profile) : null);
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/user', async (req, res) => {
    const { email, profile } = req.body;
    try {
        const db = await getDb();
        await db.run('UPDATE users SET profile = ? WHERE email = ?', [JSON.stringify(profile), email]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Logs Routes
app.get('/api/logs/today', async (req, res) => {
    const email = req.query.email;
    const date = new Date().toISOString().split('T')[0];
    try {
        const db = await getDb();
        const log = await db.get('SELECT data FROM logs WHERE email = ? AND date = ?', [email, date]);
        res.json(log ? JSON.parse(log.data) : { date, meals: [] });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/logs', async (req, res) => {
    const { email, log } = req.body;
    try {
        const db = await getDb();
        await db.run(
            'INSERT OR REPLACE INTO logs (email, date, data) VALUES (?, ?, ?)', 
            [email, log.date, JSON.stringify(log)]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});