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
            return createResponse(404, { message: 'Item not found' });
          }

          return createResponse(200, getResult.Item);
        } else {
          // List all items
          const scanResult = await docClient.send(
            new ScanCommand({
              TableName: tableName,
            })
          );

          return createResponse(200, {
            items: scanResult.Items || [],
            count: scanResult.Count || 0,
          });
        }

      case 'POST':
        if (!body) {
          return createResponse(400, { message: 'Request body is required' });
        }

        const newItem = JSON.parse(body);
        
        // Generate ID if not provided
        if (!newItem.id) {
          newItem.id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Add timestamp
        newItem.createdAt = new Date().toISOString();
        newItem.updatedAt = newItem.createdAt;

        await docClient.send(
          new PutCommand({
            TableName: tableName,
            Item: newItem,
          })
        );

        return createResponse(201, newItem);

      case 'PUT':
        if (!pathParameters?.id || !body) {
          return createResponse(400, {
            message: 'Item ID and request body are required',
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
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

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

        return createResponse(200, updateResult.Attributes);

      case 'DELETE':
        if (!pathParameters?.id) {
          return createResponse(400, { message: 'Item ID is required' });
        }

        await docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { id: pathParameters.id },
          })
        );

        return createResponse(204, '');

      default:
        return createResponse(405, { message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, {
      message: 'Internal server error',
      // Only expose error details in non-production environments
      ...(process.env.ENV !== 'prod' && { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    });
  }
};