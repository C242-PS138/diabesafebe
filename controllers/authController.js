const admin = require('firebase-admin');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userRecord = await admin.auth().createUser({
      displayName: name,
      email,
      password,
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: userRecord.uid,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  // Firebase Authentication does not support server-side login verification.
  res.status(400).json({ message: 'Login must be done using Firebase SDK on the client' });
};

exports.logout = (req, res) => {
  res.status(200).json({ message: 'Logout successful. Clear tokens on the client side.' });
};
