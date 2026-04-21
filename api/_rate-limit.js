import { sendJson } from "./_response.js";

const rateLimitBuckets = new Map();
const MAX_TRACKED_BUCKETS = 5000;

function pruneExpiredBuckets(now) {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }

  if (rateLimitBuckets.size <= MAX_TRACKED_BUCKETS) {
    return;
  }

  const overflowCount = rateLimitBuckets.size - MAX_TRACKED_BUCKETS;
  const oldestBuckets = [...rateLimitBuckets.entries()]
    .sort((left, right) => left[1].resetAt - right[1].resetAt)
    .slice(0, overflowCount);

  oldestBuckets.forEach(([key]) => {
    rateLimitBuckets.delete(key);
  });
}

export function getRequestIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    request.socket?.remoteAddress ||
    request.connection?.remoteAddress ||
    "unknown"
  );
}

function createBucketKey(keyPrefix, request) {
  return `${keyPrefix}:${getRequestIp(request)}`;
}

function consumeRateLimit(key, windowMs, max) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const currentBucket = rateLimitBuckets.get(key);

  if (!currentBucket || currentBucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return { limited: false };
  }

  if (currentBucket.count >= max) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((currentBucket.resetAt - now) / 1000)
      ),
    };
  }

  currentBucket.count += 1;

  return { limited: false };
}

export function enforceRateLimit(request, response, options) {
  const { keyPrefix, max, message, windowMs } = options;
  const bucketKey = createBucketKey(keyPrefix, request);
  const result = consumeRateLimit(bucketKey, windowMs, max);

  if (!result.limited) {
    return true;
  }

  sendJson(
    response,
    429,
    { error: message },
    { "Retry-After": String(result.retryAfterSeconds) }
  );

  return false;
}

export function clearRateLimit(request, keyPrefix) {
  rateLimitBuckets.delete(createBucketKey(keyPrefix, request));
}
