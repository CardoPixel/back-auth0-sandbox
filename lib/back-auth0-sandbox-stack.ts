import * as fs from "fs";
import * as path from "path";
import * as cdk from 'aws-cdk-lib';
import { aws_appsync as appsync, aws_iam as iam, aws_lambda as lambda, aws_dynamodb as dynamodb, aws_sns as sns } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class BackAuth0SandboxStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Roles and Policies
    const logRole = new iam.Role(this, "LogRoleAppSync", {
      assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
      description: "Allows AppSync to write logs to CloudWatch",
    });

    logRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
      })
    );

    // DynamoDB table
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // SNS Topic
    const userStatusTopic = new sns.Topic(this, 'UserStatusTopic');

    // Lambda function
    const apiLambda = new lambda.Function(this, 'ApiLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
    });
    // Environment variables for Lambda function
    apiLambda.addEnvironment('USERS_TABLE', usersTable.tableName);
    apiLambda.addEnvironment('TOPIC_ARN', userStatusTopic.topicArn);

    // Grant the Lambda function read/write permissions to the DynamoDB table
    usersTable.grantReadWriteData(apiLambda);

    // Grant the Lambda function permission to publish to the SNS topic
    userStatusTopic.grantPublish(apiLambda);

    // AppSync API
    const userAPI = new appsync.CfnGraphQLApi(this, 'userAPI', {
      name: 'userAPI',
      authenticationType: appsync.AuthorizationType.OIDC,
      openIdConnectConfig: {
        issuer: 'https://dev-n4anap17xr2qxksj.us.auth0.com',
        clientId: '8xNypIfqRuRmH9k8qe0fHnw3sflDE520'
      },
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
        cloudWatchLogsRoleArn: logRole.roleArn,
        excludeVerboseContent: false,
      },
    });

    const schemaFilePath = path.join(__dirname, "../graphql/schema.graphql");
    const graphqlSchema = fs.readFileSync(schemaFilePath, {
      encoding: "utf-8",
    });

    new appsync.CfnGraphQLSchema(this, "userAPISchema", {
      apiId: userAPI.attrApiId,
      definition: graphqlSchema,
    });

    // IAM Role for AppSync to invoke Lambda
    const appsyncLambdaRole = new iam.Role(this, 'AppSyncLambdaRole', {
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
      description: 'Role for AppSync to invoke Lambda functions',
    });

    appsyncLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [apiLambda.functionArn],
      actions: ['lambda:InvokeFunction'],
    }));

    // Data Source and Resolvers
    const lambdaDataSource = new appsync.CfnDataSource(this, 'lambdaDatasource', {
      apiId: userAPI.attrApiId,
      name: 'LambdaDatasource',
      type: 'AWS_LAMBDA',
      lambdaConfig: {
        lambdaFunctionArn: apiLambda.functionArn,
      },
      serviceRoleArn: appsyncLambdaRole.roleArn,
    });

    const getUserResolver = new appsync.CfnResolver(this, 'getUserResolver', {
      apiId: userAPI.attrApiId,
      typeName: 'Query',
      fieldName: 'getUser',
      dataSourceName: lambdaDataSource.name,
    });

    getUserResolver.node.addDependency(lambdaDataSource);

    const createUserResolver = new appsync.CfnResolver(this, 'createUserResolver', {
      apiId: userAPI.attrApiId,
      typeName: 'Mutation',
      fieldName: 'createUser',
      dataSourceName: lambdaDataSource.name,
    });

    createUserResolver.addDependency(lambdaDataSource);
  }
}
