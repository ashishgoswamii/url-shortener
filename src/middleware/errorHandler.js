module.exports = (err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);
    console.error(err.stack);
  
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message;
  
    res.status(statusCode).json({
      error: message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  };