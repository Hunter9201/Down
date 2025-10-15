const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const studentDB = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Serve your main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes

// Student Registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email, full_name } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username and password are required' 
            });
        }

        const result = await studentDB.registerStudent({
            username, password, email, full_name
        });
        
        res.json({ 
            success: true, 
            message: 'Registration successful', 
            student: result 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Student Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username and password are required' 
            });
        }

        const student = await studentDB.loginStudent(username, password);
        const studentData = await studentDB.loadStudentData(student.id);
        
        res.json({
            success: true,
            message: 'Login successful',
            student: student,
            progress: studentData.progress,
            studyPlan: studentData.studyPlan
        });
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Save Progress and Study Plan
app.post('/api/save-data', async (req, res) => {
    try {
        const { studentId, progress, studyPlan } = req.body;
        
        if (!studentId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Student ID is required' 
            });
        }

        await studentDB.saveStudentData(studentId, progress, studyPlan);
        
        res.json({ 
            success: true, 
            message: 'Data saved successfully' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Load Student Data
app.get('/api/student-data/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const studentData = await studentDB.loadStudentData(studentId);
        
        res.json({ 
            success: true, 
            data: studentData 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Countdown App server running on http://localhost:${PORT}`);
    console.log('SQLite database initialized: students.db');
});
