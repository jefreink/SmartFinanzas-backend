const mongoose = require('mongoose');

/**
 * Executes a callback within a MongoDB session (if supported).
 * Safe fallback for standalone (local) MongoDB instances.
 * 
 * @param {Function} callback Async function receiving (session) as argument.
 * @returns Response of the callback
 */
const executeTransaction = async (callback) => {
    let session = null;
    // Intenta detectar entorno local donde típicamente no hay Replica Set
    const isLocal = process.env.MONGO_URI?.includes('localhost') || process.env.MONGO_URI?.includes('127.0.0.1');

    if (!isLocal) {
        try {
            session = await mongoose.startSession();
            session.startTransaction();
        } catch (err) {
            console.warn('⚠️ Could not start transaction. Running without it. Error:', err.message);
            session = null;
        }
    } else {
        // console.log('ℹ️ Skipping MongoDB transaction (Local/Standalone detected)');
    }

    try {
        const result = await callback(session);

        if (session) {
            await session.commitTransaction();
        }
        return result;
    } catch (err) {
        if (session) {
            await session.abortTransaction();
        }
        throw err;
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

module.exports = { executeTransaction };
