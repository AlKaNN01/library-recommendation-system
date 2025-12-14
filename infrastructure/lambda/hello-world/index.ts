import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event received: ' + JSON.stringify(event));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Orgin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Acces-Control-Allow-Methods': 'GET,OPTIONS',
    },
    body: JSON.stringify({
      message: 'Hello from USA to Turkey ',
      timeStamp: new Date().toISOString(),
      path: event.path,
      method: event.httpMethod,
    }),
  };
};
