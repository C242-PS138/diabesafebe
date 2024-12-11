const admin = require('firebase-admin');
const db = admin.firestore();

exports.updateUser = async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;

  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update(updates);

    const updatedUser = (await userRef.get()).data();
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
