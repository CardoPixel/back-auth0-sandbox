// /lambda/index.ts
import { DynamoDB } from 'aws-sdk';
import { SNS } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();
const sns = new SNS();
const USERS_TABLE = process.env.USERS_TABLE!;
const TOPIC_ARN = process.env.TOPIC_ARN!;

exports.handler = async (event: any) => {
    switch (event.info.fieldName) {
        case 'getUser':
            return getUser(event.arguments.userId);
        case 'createUser':
            return createUser(event.arguments.userId, event.arguments.username, event.arguments.email);
        default:
            return null;
    }
};

const getUser = async (userId: string) => {
    const params = {
        TableName: USERS_TABLE,
        Key: { pk: userId, sk: userId }, // Ensure these keys match DynamoDB table schema
    };
    const result = await dynamoDb.get(params).promise();
    return result.Item ? result.Item.data : null;
};

const createUser = async (userId: string, username: string, email: string) => {
    const params = {
        TableName: USERS_TABLE,
        Item: {
            pk: userId,
            sk: userId,
            data: { userId, username, email }, // JSON object with user data
            entity: "USER" // New field with a fixed value
        },
    };
    await dynamoDb.put(params).promise();

    // Publish to SNS
    await sns.publish({
        Message: JSON.stringify({ userId, username, email }),
        TopicArn: TOPIC_ARN,
    }).promise();

    return { userId, username, email };
};



