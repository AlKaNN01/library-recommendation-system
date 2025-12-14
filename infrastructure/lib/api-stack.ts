import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface ApiStackProps extends cdk.StackProps {
  booksTable: dynamodb.ITable;
  readingListsTable: dynamodb.ITable;
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
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
    const getBooks = new NodejsFunction(this, 'GetBooksFuncition', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/get-books/index.ts'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      architecture: lambda.Architecture.ARM_64,
    });

    const getBooksResource = this.api.root.addResource('getBooks');
    getBooksResource.addMethod('GET', new apigateway.LambdaIntegration(getBooks));

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });
  }
}
