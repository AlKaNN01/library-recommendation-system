import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface ApiStackProps extends cdk.StackProps {
  booksTable: dynamodb.ITable;
  readingListsTable: dynamodb.ITable;
  userPool: cognito.UserPool;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly booksTable: dynamodb.ITable;
  public readonly readingListsTable: dynamodb.ITable;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Store table references
    this.booksTable = props.booksTable;
    this.readingListsTable = props.readingListsTable;
    this.api = new apigateway.RestApi(this, 'LibraryAPI', {
      restApiName: ' Library Recommendation System API',
      description: 'This is the API for the final project of the course',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'CognitoAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    const getBooks = new NodejsFunction(this, 'GetBooksFuncition', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/get-books/index.ts'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        BOOKS_TABLE_NAME: props.booksTable.tableName,
      },
    });

    const getBook = new NodejsFunction(this, 'GetBookFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/get-book/index.ts'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        BOOKS_TABLE_NAME: props.booksTable.tableName,
      },
    });
    props.booksTable.grantReadData(getBooks);
    props.booksTable.grantReadData(getBook);

    const getBooksResource = this.api.root.addResource('getBooks');
    getBooksResource.addMethod('GET', new apigateway.LambdaIntegration(getBooks));

    const getBookByIdResource = getBooksResource.addResource('{id}');
    getBookByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getBook));

    // Reading Lists Lambda Functions
    const getReadingLists = new NodejsFunction(this, 'GetReadingListsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/get-reading-lists/index.ts'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        READING_LISTS_TABLE_NAME: props.readingListsTable.tableName,
      },
    });

    const createReadingList = new NodejsFunction(this, 'CreateReadingListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/create-reading-lists/index.ts'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        READING_LISTS_TABLE_NAME: props.readingListsTable.tableName,
      },
    });

    const updateReadingList = new NodejsFunction(this, 'UpdateReadingListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/update-reading-lists/index.ts'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        READING_LISTS_TABLE_NAME: props.readingListsTable.tableName,
      },
    });

    const deleteReadingList = new NodejsFunction(this, 'DeleteReadingListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/delete-reading-lists/index.ts'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        READING_LISTS_TABLE_NAME: props.readingListsTable.tableName,
      },
    });

    // Grant permissions
    props.readingListsTable.grantReadData(getReadingLists);
    props.readingListsTable.grantWriteData(createReadingList);
    props.readingListsTable.grantReadWriteData(updateReadingList);
    props.readingListsTable.grantReadWriteData(deleteReadingList);

    // API Resources for Reading Lists
    const readingListsResource = this.api.root.addResource('reading-lists');
    readingListsResource.addMethod('GET', new apigateway.LambdaIntegration(getReadingLists), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    readingListsResource.addMethod('POST', new apigateway.LambdaIntegration(createReadingList), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const readingListByIdResource = readingListsResource.addResource('{id}');
    readingListByIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateReadingList), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    readingListByIdResource.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(deleteReadingList),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // AI Recommendations Lambda Function
    const getRecommendations = new NodejsFunction(this, 'GetRecommendationsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/get-recommendations/index.ts'),
      timeout: cdk.Duration.seconds(30), // Longer timeout for AI calls
      memorySize: 512, // More memory for AI processing
      architecture: lambda.Architecture.ARM_64,
      // AWS_REGION is automatically available in Lambda runtime
    });

    // Grant Bedrock permissions to the recommendations Lambda
    getRecommendations.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${this.region}:607104514209:inference-profile/eu.anthropic.claude-3-7-sonnet-20250219-v1:0`,
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0`,
        ],
      })
    );

    // API Resource for Recommendations
    const recommendationsResource = this.api.root.addResource('recommendations');
    recommendationsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(getRecommendations),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });
  }
}
