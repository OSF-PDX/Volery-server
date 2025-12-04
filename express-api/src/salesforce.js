const axios = require("axios");

const SALESFORCE_LOGIN_URL =
  "https://login.salesforce.com/services/oauth2/token";

async function getSalesforceToken() {
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: process.env.SALESFORCE_CLIENT_ID,
    client_secret: process.env.SALESFORCE_CLIENT_SECRET,
    username: process.env.SALESFORCE_USERNAME,
    password:
      process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN,
  });

  const res = await axios.post(SALESFORCE_LOGIN_URL, params);
  return res.data;
}

module.exports = { getSalesforceToken };
