require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

const cors = require("cors");
app.use(cors());

// API endpoint configuration
const API_BASE_URL = "https://volery.nten.org/api";
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;

// Helper function to make authenticated API calls with basic auth
async function callAPI(endpoint) {
  if (!API_USERNAME || !API_PASSWORD) {
    throw new Error(
      "API credentials not configured. Please check your .env file.",
    );
  }

  try {
    const response = await axios({
      method: "GET",
      url: `${API_BASE_URL}${endpoint}`,
      auth: {
        username: API_USERNAME,
        password: API_PASSWORD,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    throw error;
  }
}

// GET all sessions
app.get("/sessions", async (req, res) => {
  try {
    const data = await callAPI("/sessions");
    res.json(data);
  } catch (error) {
    console.error(
      "Error fetching sessions:",
      error.response?.data || error.message,
    );

    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Authentication failed",
        message: "Invalid API credentials",
      });
    }

    res.status(error.response?.status || 500).json({
      error: "Failed to fetch sessions",
      details: error.response?.data || error.message,
    });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  const credentialsConfigured = API_USERNAME && API_PASSWORD;

  res.send(`
      <h1>API Integration</h1>
      <p>Status: ${credentialsConfigured ? "✅ Configured" : "❌ Credentials Missing"}</p>
      ${credentialsConfigured ? '<p><a href="/sessions">View Sessions</a></p>' : "</p>Please configure API_USERNAME and API_PASSWORD in your .env file</p>"}
    `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (API_USERNAME && API_PASSWORD) {
    console.log(`API credentials configured - ready to fetch data`);
  } else {
    console.warn(
      "⚠️ API credentials missing - please set API_USERNAME and API_PASSWORD in .env",
    );
  }
});
