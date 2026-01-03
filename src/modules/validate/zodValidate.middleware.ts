import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import httpStatus from 'http-status';
import ApiError from '../errors/ApiError';

/**
 * Zod validation middleware
 * @param schema - Zod schema to validate against
 */
export const validateZod = (schema: AnyZodObject) => async (req: Request, _res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages));
    }
    next(error);
  }
};
