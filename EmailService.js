/**
 * EmailService.js
 * A resilient email sending service implementing retries, fallback, rate limiting, circuit breaker, and status tracking.
 */

class RateLimiter {
  constructor(limit, intervalMs) {
    this.limit = limit;
    this.intervalMs = intervalMs;
    this.queue = [];
    this.tokens = limit;
    setInterval(() => {
      this.tokens = this.limit;
      this.processQueue();
    }, this.intervalMs);
  }

  processQueue() {
    while (this.queue.length && this.tokens > 0) {
      this.tokens--;
      const next = this.queue.shift();
      next();
    }
  }

  enqueue(fn) {
    return new Promise((resolve) => {
      this.queue.push(() => resolve(fn()));
      this.processQueue();
    });
  }
}

class CircuitBreaker {
  constructor(failureThreshold, cooldownMs) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.failures = 0;
    this.lastFailureTime = 0;
  }

  allow() {
    if (this.failures < this.failureThreshold) return true;
    return Date.now() - this.lastFailureTime > this.cooldownMs;
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  reset() {
    this.failures = 0;
  }
}

class MockProvider {
  constructor(name, failRate = 0.2) {
    this.name = name;
    this.failRate = failRate;
  }

  async sendEmail(email) {
    if (Math.random() < this.failRate) throw new Error(`${this.name} failed`);
    return `${this.name} sent to ${email.id}`;
  }
}

class EmailService {
  constructor(providers) {
    this.providers = providers;
    this.rateLimiter = new RateLimiter(5, 1000); // 5 emails per second
    this.statusMap = new Map();
    this.sentEmails = new Set();
    this.circuitBreakers = providers.map(() => new CircuitBreaker(3, 5000));
  }

  async send(email) {
    if (this.sentEmails.has(email.id)) return this.statusMap.get(email.id);
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const breaker = this.circuitBreakers[i];

      if (!breaker.allow()) continue;
      try {
        const response = await this.retry(() => provider.sendEmail(email));
        breaker.reset();
        this.sentEmails.add(email.id);
        this.statusMap.set(email.id, { status: 'sent', provider: provider.name });
        return this.statusMap.get(email.id);
      } catch (err) {
        breaker.recordFailure();
        console.log(`[WARN] ${provider.name} failed: ${err.message}`);
      }
    }
    this.statusMap.set(email.id, { status: 'failed' });
    return this.statusMap.get(email.id);
  }

  async retry(fn, retries = 3, delay = 500) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        return await this.rateLimiter.enqueue(fn);
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((res) => setTimeout(res, delay * Math.pow(2, attempt)));
        attempt++;
      }
    }
  }

  getStatus(emailId) {
    return this.statusMap.get(emailId) || { status: 'unknown' };
  }
}

// Exporting for use in tests
module.exports = { EmailService, MockProvider };
