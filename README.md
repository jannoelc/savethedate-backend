# Save the Date Backend

This is a simple Lambda function on AWS that I hacked for a couple of hours as the backend of my simple RSVP app for my own wedding. This uses AWS DynamoDB for its data store.

The only dependency that this needs is `aws-sdk` which is directly usable when deploying AWS Lambda functions. I would not recommend to create backend code like this in a production setup. Instead, use robust solutions such as the [Serverless](https://github.com/serverless/serverless) framework.