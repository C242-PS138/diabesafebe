const admin = require('firebase-admin');
const db = admin.firestore();

exports.getNews = async (req, res) => {
  try {
    const newsCollection = db.collection('news');
    const snapshot = await newsCollection.get();

    if (snapshot.empty) {
      return res.status(200).json({ message: 'No news found' });
    }

    const news = [];
    snapshot.forEach(doc => news.push({ id: doc.id, ...doc.data() }));

    res.status(200).json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
