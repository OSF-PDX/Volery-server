const express = require("express");
const http = require("http");

const app = express();

app.listen(3000, () => {
  console.log("Listening on port 3000");
});

app.get("/", (req, res) => {
  http.request;
  res.send("Hello from Express! :3");
});
