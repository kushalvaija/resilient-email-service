const express = require('express');
const bodyParser = require('body-parser');
const { EmailService, MockProvider } = require('./EmailService');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Root route to avoid "Cannot GET /"
app.get('/', (req, res) => {
  res.send('📧 Email Service is running on Render!');
});

// Initialize mock providers
const providers = [
  new MockProvider('SendGrid'),
  new MockProvider('Mailgun', 0.5),
];

const emailService = new EmailService(providers);

// Automatically send email on server start
(async () => {
  const email = {
    id: 'email1',
    to: 'test@example.com',
    subject: 'Hello',
    body: 'This is a test email',
  };

  console.log("Sending email...");
  const sendResult = await emailService.send(email);
  console.log("Send result:", sendResult);

  console.log("Trying to send same email again (should skip):");
  const retryResult = await emailService.send(email);
  console.log("Retry result:", retryResult);

  const status = emailService.getStatus(email.id);
  console.log("Status check:", status);
})();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
