const express = require('express');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const serviceAccount = require('./firebase-service-account.json');
const bcrypt = require('bcrypt');
const axios = require('axios');

dotenv.config();
const app = express();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://diabesafe-id-default-rtdb.firebaseio.com/"
});

const db = admin.firestore();

app.use(express.json());
app.use(cors());

const SECRET_KEY = "alif1211"; 

// Helper Functions
const generateAccessToken = (userId) => jwt.sign({ userId }, SECRET_KEY, { expiresIn: '1h' });
const generateRefreshToken = (userId) => jwt.sign({ userId }, SECRET_KEY, { expiresIn: '7d' });

// Routes

// Register
app.post('/register', async (req, res) => {
    const { name, username, password, confirmPassword, email } = req.body;

    if (!name || !username || !password || !confirmPassword || !email) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name
        });

        await db.collection('users').doc(userRecord.uid).set({
            name,
            username,
            email,
            userId: userRecord.uid,
        });

        res.status(201).json({
            message: 'User registered successfully',
            userId: userRecord.uid
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userCredential = await admin.auth().getUserByEmail(email);
        const user = userCredential;

        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (!passwordMatch) {
            return res.status(404).json({ message: 'Invalid email or password' });
        }

        const accessToken = generateAccessToken(user.uid);
        const refreshToken = generateRefreshToken(user.uid);

        res.status(200).json({
            message: 'Logged in successfully',
            accessToken,
            refreshToken,
            data: {
                uid: user.uid,
                email: user.email,
            }
        });
    } catch (error) {
        res.status(404).json({ message: 'Invalid email or password' });
    }
});


// Logout
app.post('/logout', (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
});

// Refresh Token
app.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    try {
        const payload = jwt.verify(refreshToken, SECRET_KEY);
        const newAccessToken = generateAccessToken(payload.userId);

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        res.status(401).json({ message: 'Invalid refresh token' });
    }
});

// Get User Profile
app.get('/profile/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'User profile fetched successfully',
            user: userDoc.data()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update User Profile
app.put('/profile/:userId/update', async (req, res) => {
    const { userId } = req.params;
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        await db.collection('users').doc(userId).update({ name, email });

        res.json({
            message: 'User information updated successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Prediction
app.post('/prediction', async (req, res) => {
    const { height, weight, glucose, bloodPressure, age, predictionResult } = req.body;

    if (!height || !weight || !glucose || !bloodPressure || !age || !predictionResult) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const bmi = weight / ((height / 100) ** 2);

    try {
        const predictionDoc = {
            height,
            weight,
            bmi,
            glucose,
            bloodPressure,
            age,
            predictionResult,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        const newPrediction = await db.collection('predictions').add(predictionDoc);

        res.status(201).json({
            message: 'Prediction created successfully',
            id: newPrediction.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Prediction History
app.get('/prediction/history', async (req, res) => {
    try {
        const snapshot = await db.collection('predictions').get();
        const predictions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json({
            message: 'Prediction history fetched successfully',
            predictions
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Prediction by ID
app.get('/prediction/history/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const predictionDoc = await db.collection('predictions').doc(id).get();

        if (!predictionDoc.exists) {
            return res.status(404).json({ message: 'Prediction not found' });
        }

        res.json({
            message: 'Prediction fetched successfully',
            prediction: predictionDoc.data()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// News
app.get('/news', async (req, res) => {
    const NEWS_API_KEY = process.env.NEWS_API_KEY; 
    const NEWS_API_URL = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWS_API_KEY}`;

    try {
        const response = await axios.get(NEWS_API_URL);
        const news = response.data.articles;

        res.json({
            message: 'News fetched successfully',
            news
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
