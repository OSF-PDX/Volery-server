const axios = require("axios");

const SALESFORCE_LOGIN_URL =
  "https://empathetic-fox-3wpl87-dev-ed.trailblaze.my.salesforce.com/services/oauth2/token";

async function getSalesforceToken() {
  const fullPassword =
    process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN;

  console.log("=== Debug Info ===");
  console.log("Username:", process.env.SALESFORCE_USERNAME);
  console.log("Password length:", process.env.SALESFORCE_PASSWORD?.length);
  console.log("Token length:", process.env.SALESFORCE_SECURITY_TOKEN?.length);
  console.log("Combined password length:", fullPassword.length);
  console.log(
    "Client ID starts with:",
    process.env.SALESFORCE_CLIENT_ID?.substring(0, 15)
  );
  console.log(
    "Client Secret starts with",
    process.env.SALESFORCE_CLIENT_SECRET?.substring(0, 10)
  );
  console.log("==================");

  const params = new URLSearchParams({
    grant_type: "password",
    client_id: process.env.SALESFORCE_CLIENT_ID,
    client_secret: process.env.SALESFORCE_CLIENT_SECRET,
    username: process.env.SALESFORCE_USERNAME,
    password: fullPassword,
  });

  console.log(
    "Attempting auth with username:",
    process.env.SALESFORCE_USERNAME
  );
  console.log("URL:", SALESFORCE_LOGIN_URL);

  try {
    const res = await axios.post(SALESFORCE_LOGIN_URL, params);
    return res.data;
  } catch (error) {
    console.error("Full error:", error.response?.data);
    throw error;
  }
}

module.exports = { getSalesforceToken };
