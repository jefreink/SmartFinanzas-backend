const CustomError = require('../utils/CustomError');

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log server error details for developers
    console.error(`[ErrorHandler] ${err.name}: ${err.message}`);

    let error = { ...err };
    error.name = err.name;
    error.message = err.message;
    error.isOperational = err.isOperational;

    // Transform Mongoose bad ObjectId
    if (error.name === 'CastError') {
        const message = `Recurso no encontrado. ID inválido: ${error.value}`;
        error = new CustomError(message, 400);
    }

    // Transform Mongoose duplicate key
    if (error.code === 11000) {
        const message = `Entrada duplicada. Por favor, usa otro valor.`;
        error = new CustomError(message, 400);
    }

    // Transform Mongoose Validation Error
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(el => el.message);
        const message = `Datos de entrada inválidos. ${errors.join('. ')}`;
        error = new CustomError(message, 400);
    }

    // Transform JWT Errors
    if (error.name === 'JsonWebTokenError') {
        const message = 'Token inválido. Por favor, inicia sesión nuevamente.';
        error = new CustomError(message, 401);
    }

    if (error.name === 'TokenExpiredError') {
        const message = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        error = new CustomError(message, 401);
    }

    // Send Error Response
    if (error.isOperational) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }

    // Si no es operacional (Error de programación o librería no controlado)
    // Ocultamos los detalles al usuario final
    return res.status(500).json({
        success: false,
        message: 'Error interno del servidor. Por favor, inténtalo más tarde.'
    });
};

module.exports = errorHandler;
