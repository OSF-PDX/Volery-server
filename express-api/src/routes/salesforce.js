const express = require("express");
const axios = require("axios");
// import { getSalesforceToken } from "../salesforce.js";
const { getSalesforceToken } = require("../salesforce.js");

const router = express.Router();

router.get("/accounts", async (req, res) => {
  try {
    const auth = await getSalesforceToken();

    const soql = "SELECT Id, Name, BillingCity FROM Account LIMIT 10";
    const url = `${
      auth.instance_url
    }/services/data/v60.0/query/?q=${encodeURIComponent(soql)}`;

    const results = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${auth.access_token}`,
        "Content-Type": "application/vnd.api+json",
      },
    });

    res.json(results.data.records);
  } catch (err) {
    console.error("Salesforce error", err.response?.data || err);
    res.status(500).json({ error: "Failed to fetch Salesforce data" });
  }
});

module.exports = router;
