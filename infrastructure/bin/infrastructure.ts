#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';
import { DatabaseStack } from '../lib/database-stack';
import { AuthStack } from '../lib/auth-stack';

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-north-1',
};

const databaseStack = new DatabaseStack(app, 'LibraryDatabaseStack', { env });

const authStack  = new AuthStack(app,'LibraryAuthStack',{env}) ;

const apiStack = new ApiStack(app, 'LibraryApiStack', {
  env,
  booksTable: databaseStack.booksTable,
  readingListsTable: databaseStack.readingListsTable,
  userPool: authStack.userPool
});

apiStack.addDependency(databaseStack);
apiStack.addDependency(authStack);