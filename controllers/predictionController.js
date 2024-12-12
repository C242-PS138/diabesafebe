const admin = require('firebase-admin');
const db = admin.firestore();

const calculateBMI = (height, weight) => {
  return (weight / ((height / 100) ** 2)).toFixed(2);
};1

exports.makePrediction = async (req, res) => {
  const { height, weight, glucose, bloodPressure, age } = req.body;

  try {
    if (!height || !weight || !glucose || !bloodPressure || !age) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const bmi = calculateBMI(height, weight);

    const predictionDoc = {
      height,
      weight,
      glucose,
      bloodPressure,
      age,
      bmi,
      result: "Pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('predictions').add(predictionDoc);

    res.status(201).json({ id: docRef.id, ...predictionDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
