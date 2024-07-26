# Welcome to back-auth-0-sandbox

This is an AWS CDK project with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## VARIABLES NEEDED IN THE .env.local file

AUTH0_ISSUER_BASE_URL='YOUR_AUTH0_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='YOUR_CLIENT_ID'

## Information

<https://aws.amazon.com/blogs/mobile/appsync-auth0/>

## Command to get the token via CURL

```bash
curl --request POST   --url https://YOUR_AUTH0_DOMAIN.auth0.com/oauth/token   --header 'content-type: application/json'   --data '{"client_id":"YOUR_CLIENT_ID","client_secret":"YOUR_CLIENT_SECRET","audience":"GRAPHQL_ENDPOINT","grant_type":"client_credentials"}'
```
