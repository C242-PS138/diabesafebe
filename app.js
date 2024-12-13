const express = require('express');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const serviceAccount = require('./firebase-service-account.json');
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

// Register
app.post('/register', async (req, res) => {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        const userDoc = await db.collection('users').where('email', '==', email).get();

        if (!userDoc.empty) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const hashedPassword = jwt.sign(password, SECRET_KEY);
        const newUser = await db.collection('users').add({
            email,
            password: hashedPassword,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({
            message: 'User registered successfully',
            userId: newUser.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const userSnapshot = await db.collection('users').where('email', '==', email).get();

        if (userSnapshot.empty) {
            return res.status(404).json({ message: 'Invalid email or password' });
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        const isPasswordValid = jwt.verify(password, SECRET_KEY) === userData.password;
        if (!isPasswordValid) {
            return res.status(404).json({ message: 'Invalid email or password' });
        }

        const accessToken = generateAccessToken(userDoc.id);
        const refreshToken = generateRefreshToken(userDoc.id);

        res.status(200).json({
            message: 'Logged in successfully',
            accessToken,
            refreshToken,
            data: {
                uid: userDoc.id,
                email: userData.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
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

//Language
app.post('/language', (req, res) => {
    const { language } = req.body;

    if (!language) {
        return res.status(400).json({ message: 'Language is required' });
    }

    if (language !== 'english' && language !== 'indonesia') {
        return res.status(400).json({ message: 'Invalid language' });
    }

    res.json({
        message: `Language changed to ${language}`
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
