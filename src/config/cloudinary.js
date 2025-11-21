const cloudinary = require('cloudinary').v2;

const isConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  const hasCloudName = !!cloudName;
  const hasApiKey = !!apiKey;
  const hasApiSecret = !!apiSecret;
  
  // Debug: log which vars are missing (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Cloudinary env check:', {
      CLOUDINARY_CLOUD_NAME: hasCloudName ? `✓ (${cloudName?.substring(0, 4)}...)` : '✗ missing',
      CLOUDINARY_API_KEY: hasApiKey ? `✓ (${apiKey?.substring(0, 4)}...)` : '✗ missing',
      CLOUDINARY_API_SECRET: hasApiSecret ? '✓ (***)' : '✗ missing',
    });
  }
  
  return hasCloudName && hasApiKey && hasApiSecret;
};

// Only configure Cloudinary if all env vars are present
if (isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn('⚠️  Cloudinary not configured. CSV file uploads will be disabled.');
}

module.exports = {
  cloudinary,
  isConfigured,
};


