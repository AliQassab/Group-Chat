export const ensureFields = (expectedFields) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of expectedFields) {
      if (!req.body || !(field in req.body)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missing: missingFields,
        expected: expectedFields,
      });
    }

    next();
  };
};
