const LIMIT = 10; // Maximum number of requests allowed per hour
const WINDOW = 60 * 60 * 1000; // One hour in milliseconds

const rateLimitMap = new Map<string, { count: number; lastRequestTime: number }>();

export function checkRateLimit(ip: string): boolean {
  const currentTime = Date.now();
  const entry = rateLimitMap.get(ip);

  // Exclude your own IP address from rate limiting
  const yourIpAddress = '67.161.80.232';
  if (ip === yourIpAddress) {
    return true;
  }

  if (entry) {
    const { count, lastRequestTime } = entry;

    if (currentTime - lastRequestTime > WINDOW) {
      // Reset the request count if the time window has passed
      rateLimitMap.set(ip, { count: 1, lastRequestTime: currentTime });
      return true;
    }

    if (count >= LIMIT) {
      // Rate limit exceeded
      return false;
    }

    // Increment the request count
    rateLimitMap.set(ip, { count: count + 1, lastRequestTime: currentTime });
    return true;
  } else {
    // First request for the IP
    rateLimitMap.set(ip, { count: 1, lastRequestTime: currentTime });
    return true;
  }
}