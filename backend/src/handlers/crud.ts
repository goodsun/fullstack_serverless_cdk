import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { HTTP_STATUS, ERROR_MESSAGES, generateTimestamp } from '../constants';

const client = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

// Common response headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper function to create response
const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, path, pathParameters, body } = event;

    // Handle different HTTP methods
    switch (httpMethod) {
      case 'GET':
        if (pathParameters?.id) {
          // Get specific item
          const getResult = await docClient.send(
            new GetCommand({
              TableName: tableName,
              Key: { id: pathParameters.id },
            })
          );

          if (!getResult.Item) {
            return createResponse(HTTP_STATUS.NOT_FOUND, { message: ERROR_MESSAGES.ITEM_NOT_FOUND });
          }

          return createResponse(HTTP_STATUS.OK, getResult.Item);
        } else {
          // List all items
          const scanResult = await docClient.send(
            new ScanCommand({
              TableName: tableName,
            })
          );

          return createResponse(HTTP_STATUS.OK, {
            items: scanResult.Items || [],
            count: scanResult.Count || 0,
          });
        }

      case 'POST':
        if (!body) {
          return createResponse(HTTP_STATUS.BAD_REQUEST, { message: ERROR_MESSAGES.BODY_REQUIRED });
        }

        const newItem = JSON.parse(body);
        
        // Generate ID if not provided
        if (!newItem.id) {
          newItem.id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Add timestamp
        const timestamp = generateTimestamp();
        newItem.createdAt = timestamp;
        newItem.updatedAt = timestamp;

        await docClient.send(
          new PutCommand({
            TableName: tableName,
            Item: newItem,
          })
        );

        return createResponse(HTTP_STATUS.CREATED, newItem);

      case 'PUT':
        if (!pathParameters?.id || !body) {
          return createResponse(HTTP_STATUS.BAD_REQUEST, {
            message: ERROR_MESSAGES.ID_AND_BODY_REQUIRED,
          });
        }

        const updateData = JSON.parse(body);
        delete updateData.id; // Don't update the ID
        
        // Build update expression
        const updateExpressionParts: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};
        
        Object.keys(updateData).forEach((key, index) => {
          const attrName = `#attr${index}`;
          const attrValue = `:val${index}`;
          
          updateExpressionParts.push(`${attrName} = ${attrValue}`);
          expressionAttributeNames[attrName] = key;
          expressionAttributeValues[attrValue] = updateData[key];
        });
        
        // Add updatedAt
        updateExpressionParts.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = generateTimestamp();

        const updateResult = await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { id: pathParameters.id },
            UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
          })
        );

        return createResponse(HTTP_STATUS.OK, updateResult.Attributes);

      case 'DELETE':
        if (!pathParameters?.id) {
          return createResponse(HTTP_STATUS.BAD_REQUEST, { message: ERROR_MESSAGES.ID_REQUIRED });
        }

        await docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { id: pathParameters.id },
          })
        );

        return createResponse(HTTP_STATUS.NO_CONTENT, '');

      default:
        return createResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, { message: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    }
  } catch (error) {
    console.error('Error:', error);
    return createResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      message: ERROR_MESSAGES.INTERNAL_ERROR,
      // Only expose error details in non-production environments
      ...(process.env.ENV !== 'prod' && { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    });
  }
};