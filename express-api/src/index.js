const express = require("express");
const salesforceRoutes = require("../routes/salesforce.js");

const app = express();

app.use("/api", salesforceRoutes);

app.listen(3000, () => {
  console.log("Listening on port 3000");
});

app.get("/", (req, res) => {
  res.redirect("/api/accounts");
});
