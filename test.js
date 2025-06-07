const { EmailService, MockProvider } = require('./EmailService');

const providers = [
  new MockProvider('SendGrid', 0.5), // Simulate 50% failure
  new MockProvider('Mailgun', 0.3)   // Simulate 30% failure
];

const emailService = new EmailService(providers);

const email = {
  id: 'email-123',
  to: 'someone@example.com',
  body: 'Hello from Resilient Email Service!'
};

async function runTest() {
  console.log('Sending email...');
  const result = await emailService.send(email);
  console.log('Send result:', result);

  console.log('Trying to send same email again (should skip):');
  const retry = await emailService.send(email);
  console.log('Retry result:', retry);

  console.log('Status check:', emailService.getStatus(email.id));
}

runTest();
