import { HttpException, HttpStatus } from '@nestjs/common';

export function authError(
  status: HttpStatus,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): HttpException {
  return new HttpException(
    {
      statusCode: status,
      code,
      message,
      ...details,
    },
    status,
  );
}
