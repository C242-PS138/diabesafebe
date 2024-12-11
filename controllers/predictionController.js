const admin = require('firebase-admin');
const db = admin.firestore();

exports.makePrediction = async (req, res) => {
  const { height, weight, glucose, bloodPressure, age } = req.body;

  try {
    // Validate required fields
    if ( !height || !weight || !glucose || !bloodPressure || !age) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Use Firebase Firestore for prediction storage
    const predictionDoc = {
      height,
      weight,
      glucose,
      bloodPressure,
      age,
      result: "Pending", // Placeholder for prediction result
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save prediction data to Firestore
    const docRef = await db.collection('predictions').add(predictionDoc);

    res.status(201).json({ id: docRef.id, ...predictionDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
