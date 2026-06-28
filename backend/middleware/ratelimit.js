const rateLimit = require("express-rate-limit");

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000;
const limit = Number(process.env.RATE_LIMIT_MAX) || 30;

const apiLimiter = rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many API requests. Please try again later.",
            retryAfter: Math.ceil(windowMs / 1000),
        });
    },
});

module.exports = apiLimiter;
