const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class StudentDatabase {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'students.db'), (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Connected to SQLite database');
                this.initTables();
            }
        });
    }

    // Initialize database tables
    initTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                email VARCHAR(100),
                full_name VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS student_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                progress_data TEXT DEFAULT '{}',
                study_plan TEXT DEFAULT '[]',
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
            )`
        ];

        queries.forEach(query => {
            this.db.run(query, (err) => {
                if (err) {
                    console.error('Error creating table:', err);
                }
            });
        });
    }

    // Student Registration
    async registerStudent(studentData) {
        const { username, password, email, full_name } = studentData;
        const passwordHash = await bcrypt.hash(password, 10);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO students (username, password_hash, email, full_name) 
                 VALUES (?, ?, ?, ?)`,
                [username, passwordHash, email, full_name],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        // Create initial progress record
                        this.db.run(
                            `INSERT INTO student_progress (student_id) VALUES (?)`,
                            [this.lastID],
                            (err) => {
                                if (err) console.error('Error creating progress:', err);
                            }
                        );
                        resolve({ id: this.lastID, username, email, full_name });
                    }
                }
            );
        });
    }

    // Student Login
    async loginStudent(username, password) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM students WHERE username = ?`,
                [username],
                async (err, student) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (!student) {
                        reject(new Error("Student not found"));
                        return;
                    }
                    
                    // Verify password
                    const isValid = await bcrypt.compare(password, student.password_hash);
                    if (!isValid) {
                        reject(new Error("Invalid password"));
                        return;
                    }
                    
                    // Remove password hash from response
                    const { password_hash, ...studentSafe } = student;
                    resolve(studentSafe);
                }
            );
        });
    }

    // Save Student Progress and Study Plan
    async saveStudentData(studentId, progressData, studyPlan) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO student_progress 
                 (student_id, progress_data, study_plan, last_updated) 
                 VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    studentId,
                    JSON.stringify(progressData || {}),
                    JSON.stringify(studyPlan || [])
                ],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    // Load Student Progress and Study Plan
    async loadStudentData(studentId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM student_progress WHERE student_id = ?`,
                [studentId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (row) {
                        resolve({
                            progress: JSON.parse(row.progress_data || '{}'),
                            studyPlan: JSON.parse(row.study_plan || '[]'),
                            lastUpdated: row.last_updated
                        });
                    } else {
                        // Return default data if none exists
                        resolve({
                            progress: {},
                            studyPlan: [],
                            lastUpdated: new Date().toISOString()
                        });
                    }
                }
            );
        });
    }

    // Get student by ID
    async getStudentById(studentId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT id, username, email, full_name, created_at 
                 FROM students WHERE id = ?`,
                [studentId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    // Close database connection
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

// Create and export database instance
const studentDB = new StudentDatabase();
module.exports = studentDB;
