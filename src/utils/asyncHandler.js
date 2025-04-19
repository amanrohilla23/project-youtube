const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
            .catch((err) => next(err));  // Catches errors and forwards them to the error handler
    };
};

export { asyncHandler };
