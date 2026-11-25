/**
 * Standardized API Success Response
 */
export const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standardized API Error Response
 */
export const sendError = (res, statusCode = 500, message = 'Internal Server Error', error = 'INTERNAL_SERVER_ERROR') => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};
