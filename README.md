# Volery-server

## Launch directions

1. Make sure you have `.env` at the project root with the correct environment variables. You can find those variables in our LastPass account within the file `volery server .env`. If you don't have `.env`, just copy-paste the text from that file into a new `.env` file at your project root.
2. If you haven't already, run `npm install` from the project root to ensure you have all the necessary packages.
3. From the project root, run `node express-api/src/app.js` to launch the server.
4. Open a web browser and navigate to http://localhost:3000.
5. Click on "Login with Salesforce." You will be redirected to a Salesforce login page.
6. Make sure you are actively chatting with Abby for this next step. Log in with my credentials, which are stored in LastPass within the file `Volery-Server Salesforce login credentials`. You will be given a multi-factor authentication prompt, which requires a code that will be sent to Abby's gmail inbox.
7. Once you log in, you will be redirected back to http://localhost:3000. From here, you can click the "View Accounts" link to confirm that you are able to make an API call.