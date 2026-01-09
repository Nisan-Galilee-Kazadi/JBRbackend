# Backend Deployment Guide for Render

## Prerequisites
- MongoDB Atlas database (free tier available)
- Render account (free tier available)

## Deployment Steps

### 1. Database Setup
1. Create a MongoDB Atlas account
2. Create a new cluster (free tier)
3. Create a database user with read/write permissions
4. Get your connection string from Atlas
5. Add your IP to the whitelist (or use 0.0.0.0/0 for Render)

### 2. Render Configuration
1. Push your code to GitHub/GitLab
2. Create a new Web Service on Render
3. Connect your repository
4. Set the following environment variables in Render:
   - `NODE_ENV`: production
   - `PORT`: 5000
   - `MONGO_URI`: your MongoDB Atlas connection string
   - `JWT_SECRET`: generate a random secret string

### 3. Automatic Deployment
The `render.yaml` file will configure:
- Node.js environment
- Build command: `npm install`
- Start command: `node index.js`
- Health check endpoint: `/health`

### 4. CORS Configuration
Update your frontend to use the Render backend URL:
```
const API_URL = 'https://your-backend-name.onrender.com/api'
```

## Important Notes
- The free tier has a 15-minute cold start time
- MongoDB Atlas free tier has a 512MB storage limit
- Monitor your usage to avoid exceeding free tier limits
- Set up proper error handling and logging in production

## Environment Variables Reference
See `.env.production` for a complete list of required environment variables.
