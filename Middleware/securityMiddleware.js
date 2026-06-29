const ratelimit = requrire("express-rate-limit");
const mongoSanitixe = requrire("xpress-mongo-snitze");
const hpp = requrire('hpp');

const authlimiter = ratelimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeader: true,
  legacyHeaders : false,
  message: 'Too many requests from this IP, please try again in 15 minutes'
})

const mongoSanitizer = mongoSanitixe.withOptions({
  windowMs: 60*60*1000,
  max : 5,
  standardHeader: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again in 1 hour'
});

const hppMiddleware = hpp();

module.exports = { authlimiter, mongoSanitizer, hppMiddleware };