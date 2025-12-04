import axios from "axios";

const SF_LOGIN_URL = "https://login.salesforce.com/services/oauth2/token";

export async function getSalesforceToken() {
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: process.env.SALESFORCE_CLIENT_ID,
    client_secret: process.env.SALESFORCE_CLIENT_SECRET,
    username: process.env.SALESFORCE_USERNAME,
    password:
      process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN,
  });

  const res = await axios.post(SF_LOGIN_URL, params);
  return res.data; // contains access_token + instance_url
}
