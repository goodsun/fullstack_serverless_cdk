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

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

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
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ message: 'Item not found' }),
            };
          }

          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(getResult.Item),
          };
        } else {
          // List all items
          const scanResult = await docClient.send(
            new ScanCommand({
              TableName: tableName,
            })
          );

          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              items: scanResult.Items || [],
              count: scanResult.Count || 0,
            }),
          };
        }

      case 'POST':
        if (!body) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Request body is required' }),
          };
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

        return {
          statusCode: 201,
          headers: corsHeaders,
          body: JSON.stringify(newItem),
        };

      case 'PUT':
        if (!pathParameters?.id || !body) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              message: 'Item ID and request body are required',
            }),
          };
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

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(updateResult.Attributes),
        };

      case 'DELETE':
        if (!pathParameters?.id) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Item ID is required' }),
          };
        }

        await docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { id: pathParameters.id },
          })
        );

        return {
          statusCode: 204,
          headers: corsHeaders,
          body: '',
        };

      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};