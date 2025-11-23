require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const morgan = require('morgan');

const connectDB = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const apiRoutes = require('./routes/apiRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

const app = express();
const port = process.env.PORT || 4000;

const ensureEnv = (key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
};

['MONGODB_URI', 'SESSION_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'].forEach(ensureEnv);

const startServer = async () => {
  try {
    await connectDB();

    app.use(morgan('dev'));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use(
      session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 4 },
        store: MongoStore.create({
          mongoUrl: process.env.MONGODB_URI,
          collectionName: 'sessions',
        }),
      })
    );

    app.use(express.static(path.join(__dirname, '..', 'public')));

    app.use('/admin', adminRoutes);
    app.use('/api', apiRoutes);
    app.use('/sessions', sessionRoutes);

    app.use((req, res) => res.status(404).send('Route not found'));

    app.use((err, req, res, next) => {
      console.error(err);
      const message = process.env.NODE_ENV === 'production' ? 'Server error' : err.message;
      res.status(500).send(message);
    });

    app.listen(port, () => {
      console.log(`🚀 Server ready on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();

