import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

export async function getDb() {
  if (db) return db;
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      password TEXT,
      name TEXT,
      profile TEXT
    );
    CREATE TABLE IF NOT EXISTS logs (
      email TEXT,
      date TEXT,
      data TEXT,
      PRIMARY KEY (email, date)
    );
  `);

  const countResult = await db.get('SELECT count(*) as count FROM users');
  
  if (countResult.count < 100) {
    console.log("Seeding database with 100 random users...");
    const stmt = await db.prepare('INSERT OR IGNORE INTO users (email, password, name, profile) VALUES (?, ?, ?, ?)');
    
    const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
    const goals = ['Lose Weight', 'Maintain', 'Gain Muscle'];
    const activities = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'];
    
    for (let i = 0; i < 100; i++) {
        const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
        const name = `${fname} ${lname}`;
        const email = `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@example.com`;
        
        const profile = JSON.stringify({
            name,
            age: 20 + Math.floor(Math.random() * 40),
            gender: Math.random() > 0.5 ? 'Male' : 'Female',
            height: 160 + Math.floor(Math.random() * 30),
            weight: 60 + Math.floor(Math.random() * 40),
            goal: goals[Math.floor(Math.random() * 3)],
            activityLevel: activities[Math.floor(Math.random() * 4)],
            targetCalories: 2000 + Math.floor(Math.random() * 1000),
            targetProtein: 100 + Math.floor(Math.random() * 100),
            dietaryRestrictions: 'None'
        });
        
        await stmt.run(email, 'password123', name, profile);
    }
    await stmt.finalize();
    console.log("Seeding complete.");
  }
  
  return db;
}