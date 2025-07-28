export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  BODY_REQUIRED: 'Request body is required',
  ID_REQUIRED: 'Item ID is required',
  ID_AND_BODY_REQUIRED: 'Item ID and request body are required',
  ITEM_NOT_FOUND: 'Item not found',
  METHOD_NOT_ALLOWED: 'Method not allowed',
  INTERNAL_ERROR: 'Internal server error',
} as const;

export const generateTimestamp = (): string => {
  return new Date().toISOString();
};