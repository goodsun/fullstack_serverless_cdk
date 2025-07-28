import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.SETTINGS_TABLE_NAME!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
    const { httpMethod, pathParameters } = event;
    const settingKey = pathParameters?.key || 'app_config';

    switch (httpMethod) {
      case 'GET':
        // Get setting
        const result = await docClient.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              settingKey,
              version: 'latest',
            },
          })
        );

        if (!result.Item) {
          return createResponse(404, { message: 'Settings not found' });
        }

        return createResponse(200, result.Item);

      case 'PUT':
        // Update setting
        if (!event.body) {
          return createResponse(400, { message: 'Request body is required' });
        }

        const body = JSON.parse(event.body);
        
        const settingItem = {
          settingKey,
          version: 'latest',
          data: body.data || body,
          updatedAt: new Date().toISOString(),
        };

        await docClient.send(
          new PutCommand({
            TableName: tableName,
            Item: settingItem,
          })
        );

        return createResponse(200, settingItem);

      default:
        return createResponse(405, { message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, {
      message: 'Internal server error',
      ...(process.env.ENV !== 'prod' && {
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    });
  }
};