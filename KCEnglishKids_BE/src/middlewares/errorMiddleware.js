const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (err.name === 'ValidationError' || err.name === 'CastError' || err.code === 11000 ? 400 : (res.statusCode >= 400 ? res.statusCode : 500));
  res.status(statusCode).json({
    success: false,
    message: err.code === 11000 && (err.keyPattern?.normalizedName || err.keyPattern?.name) ? 'Tên lớp học đã tồn tại. Vui lòng chọn tên khác.'
      : err.code === 11000 && err.keyPattern?.teacher ? 'Giáo viên đã có một lớp đang hoạt động hoặc sắp mở.' : err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { notFound, errorHandler };
