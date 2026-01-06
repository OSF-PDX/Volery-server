require("dotenv").config();
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

// Store access token and PKCE verifier (in production, use proper session management)
let salesforceAuth = {
  access_token: null,
  refresh_token: null,
  instance_url: null,
};

// Temporary storage for PKCE verifier (in production, use sessions)
let pkceVerifier = null;

// OAuth endpoints
const SF_LOGIN_URL = process.env.SF_LOGIN_URL || "https://login.salesforce.com";
const SF_AUTHORIZE_URL = `${SF_LOGIN_URL}/services/oauth2/authorize`;
const SF_TOKEN_URL = `${SF_LOGIN_URL}/services/oauth2/token`;
const REDIRECT_URI = "http://localhost:3000/oauth/callback";

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return { verifier, challenge };
}

// Step 1: Redirect user to Salesforce login with PKCE
app.get("/auth/salesforce", (req, res) => {
  const { verifier, challenge } = generatePKCE();
  pkceVerifier = verifier; // Store for later use

  const authUrl =
    `${SF_AUTHORIZE_URL}?` +
    `response_type=code&` +
    `client_id=${process.env.SF_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `code_challenge=${challenge}&` +
    `code_challenge_method=S256&` +
    `scope=api refresh_token offline_access`;

  console.log("Redirecting to Salesforce for authorization...");
  res.redirect(authUrl);
});

// Step 2: Handle OAuth callback and exchange code for token
app.get("/oauth/callback", async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error("OAuth error:", error, error_description);
    return res
      .status(400)
      .send(`Authentication error: ${error_description || error}`);
  }

  if (!code) {
    return res.status(400).send("No authorization code received");
  }

  if (!pkceVerifier) {
    return res
      .status(400)
      .send("PKCE verifier not found. Please try authenticating again.");
  }

  try {
    console.log("Received authorization code, exchanging for access token...");

    const response = await axios.post(
      SF_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code_verifier: pkceVerifier, // Include PKCE verifier
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    salesforceAuth.access_token = response.data.access_token;
    salesforceAuth.refresh_token = response.data.refresh_token;
    salesforceAuth.instance_url = response.data.instance_url;

    // Clear the verifier after successful exchange
    pkceVerifier = null;

    console.log("Successfully authenticated with Salesforce!");
    res.send(`
      <h1>Authentication Successful!</h1>
      <p>You can now close this window and use the API.</p>
      <p><a href="/accounts">View Accounts</a></p>
    `);
  } catch (error) {
    console.error(
      "Token exchange error:",
      error.response?.data || error.message
    );
    res
      .status(500)
      .send(
        "Authentication failed: " +
          (error.response?.data?.error_description || error.message)
      );
  }
});

// Function to refresh access token when it expires
async function refreshAccessToken() {
  if (!salesforceAuth.refresh_token) {
    throw new Error("No refresh token available. Please re-authenticate.");
  }

  try {
    console.log("Refreshing access token...");

    const response = await axios.post(
      SF_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: salesforceAuth.refresh_token,
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    salesforceAuth.access_token = response.data.access_token;
    salesforceAuth.instance_url = response.data.instance_url;

    console.log("Access token refreshed successfully");
    return salesforceAuth;
  } catch (error) {
    console.error(
      "Token refresh error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Helper function to make authenticated Salesforce API calls
async function callSalesforceAPI(method, endpoint, data = null) {
  if (!salesforceAuth.access_token) {
    throw new Error("Not authenticated. Please visit /auth/salesforce first.");
  }

  try {
    const config = {
      method,
      url: `${salesforceAuth.instance_url}${endpoint}`,
      headers: {
        Authorization: `Bearer ${salesforceAuth.access_token}`,
        "Content-Type": "application/json",
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    // If token expired (401), refresh and retry
    if (error.response?.status === 401 && salesforceAuth.refresh_token) {
      console.log("Token expired, refreshing...");
      await refreshAccessToken();

      // Retry the request with new token
      const config = {
        method,
        url: `${salesforceAuth.instance_url}${endpoint}`,
        headers: {
          Authorization: `Bearer ${salesforceAuth.access_token}`,
          "Content-Type": "application/json",
        },
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    }

    throw error;
  }
}

// Example: GET Account records
app.get("/accounts", async (req, res) => {
  try {
    const data = await callSalesforceAPI(
      "GET",
      "/services/data/v59.0/query?q=" +
        encodeURIComponent("SELECT Id, Name, Industry FROM Account LIMIT 10")
    );

    res.json(data);
  } catch (error) {
    console.error(
      "Error fetching accounts:",
      error.response?.data || error.message
    );

    if (error.message.includes("Not authenticated")) {
      return res.status(401).json({
        error: "Not authenticated",
        message: "Please visit /auth/salesforce to log in first",
      });
    }

    res.status(500).json({
      error: "Failed to fetch accounts",
      details: error.response?.data || error.message,
    });
  }
});

// Example: GET a specific Account by ID
app.get("/accounts/:id", async (req, res) => {
  try {
    const data = await callSalesforceAPI(
      "GET",
      `/services/data/v59.0/sobjects/Account/${req.params.id}`
    );

    res.json(data);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);

    if (error.message.includes("Not authenticated")) {
      return res.status(401).json({
        error: "Not authenticated",
        message: "Please visit /auth/salesforce to log in first",
      });
    }

    res.status(error.response?.status || 500).json({
      error: "Failed to fetch account",
      details: error.response?.data || error.message,
    });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send(`
    <h1>Salesforce Express Integration</h1>
    <p>Status: ${
      salesforceAuth.access_token ? "✅ Authenticated" : "❌ Not Authenticated"
    }</p>
    ${
      !salesforceAuth.access_token
        ? '<p><a href="/auth/salesforce">Login with Salesforce</a></p>'
        : ""
    }
    ${
      salesforceAuth.access_token
        ? '<p><a href="/accounts">View Accounts</a></p>'
        : ""
    }
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT}/auth/salesforce to authenticate`);
});
