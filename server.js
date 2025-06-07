const express = require('express');
const bodyParser = require('body-parser');
const { EmailService, MockProvider } = require('./EmailService');

const app = express();
app.use(bodyParser.json());

const providers = [new MockProvider('SendGrid'), new MockProvider('Mailgun', 0.5)];
const emailService = new EmailService(providers);

// Home route
app.get('/', (req, res) => {
  res.send("📧 Email Service is running on Render!");
});

// Public route to trigger and view output
app.get('/send', async (req, res) => {
  const email = {
    id: 'email1',
    to: 'test@example.com',
    subject: 'Hello',
    body: 'This is a test email',
  };

  let output = [];

  output.push("📤 Sending email...");
  const sendResult = await emailService.send(email);
  output.push(`Send result: ${sendResult}`);

  output.push("🔁 Trying to send same email again (should skip):");
  const retryResult = await emailService.send(email);
  output.push(`Retry result: ${retryResult}`);

  const status = emailService.getStatus(email.id);
  output.push("📊 Status check:");
  output.push(JSON.stringify(status, null, 2));

  res.setHeader('Content-Type', 'text/plain');
  res.send(output.join('\n'));
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
