// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  ITEM_NOT_FOUND: 'Item not found',
  BODY_REQUIRED: 'Request body is required',
  ID_AND_BODY_REQUIRED: 'Item ID and request body are required',
  ID_REQUIRED: 'Item ID is required',
  METHOD_NOT_ALLOWED: 'Method not allowed',
  INTERNAL_ERROR: 'Internal server error',
} as const;

// Helper function to generate timestamp
export const generateTimestamp = (): string => new Date().toISOString();