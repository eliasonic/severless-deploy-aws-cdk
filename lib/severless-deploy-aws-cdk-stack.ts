import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path'

export interface LambdaProps extends cdk.StackProps {
  stage: string
}

export class SeverlessDeployAwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id, props);

    const { stage } = props

    // The code that defines your stack goes here
    const pomDynamodbTable = new cdk.aws_dynamodb.Table(this, `pom-dynamodb-${stage}`, {
      tableName: 'pom-dynamodb',
      partitionKey: { name: 'ID', type: cdk.aws_dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    const pomLambdaFunc = new cdk.aws_lambda.Function(this, `pom-lambda-${stage}`, {
      functionName: 'pom-lambda',
      runtime: cdk.aws_lambda.Runtime.NODEJS_16_X,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '..', 'src')),
      handler: 'index.handler',
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      logRetention: cdk.aws_logs.RetentionDays.FIVE_DAYS,
      environment: {
        STAGE: stage
      },
      initialPolicy: [
        new cdk.aws_iam.PolicyStatement({
          effect: cdk.aws_iam.Effect.ALLOW,
          actions: ['dynamodb:*'],
          resources: [pomDynamodbTable.tableArn]
        })
      ]
    })

    // dynamodbTable.grantReadWriteData(lambdaFunc)
    
    // const pomApiGatewayProxy = new cdk.aws_apigateway.LambdaRestApi(this, `pom-apigateway-proxy-${stage}`, {
    //   handler: pomLambdaFunc,
    //   proxy: true,
    //   binaryMediaTypes: ['*/*'],
    //   deploy: true,
    //   deployOptions: {
    //     stageName: stage
    //   }
    // })

    // Api Gateway with Explicit Resource and Method
    const pomApiGateway = new cdk.aws_apigateway.RestApi(this, `pom-apigateway-${stage}`, {
      restApiName: 'pom-apigateway',
      defaultCorsPreflightOptions: {
        allowOrigins: cdk.aws_apigateway.Cors.ALL_ORIGINS
      }
    })

    const postLambdaIntegration = new cdk.aws_apigateway.LambdaIntegration(pomLambdaFunc)

    const calc = pomApiGateway.root.addResource('calc')
    calc.addMethod('POST', postLambdaIntegration)
    

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'pomDynamodbTable', {
      exportName: 'pomDynamodbTable-arn',
      value: pomDynamodbTable.tableArn
    })

    new cdk.CfnOutput(this, 'pomLambdaFunc', {
      exportName: 'pomLambdaFunc-arn',
      value: pomLambdaFunc.functionArn
    })

    // new cdk.CfnOutput(this, 'pomApiGatewayProxy', {
    //   exportName: 'pomApiGatewayProxy-arn',
    //   value: pomApiGatewayProxy.restApiName
    // })

    new cdk.CfnOutput(this, 'pomApiGateway', {
      exportName: 'pomApiGateway-arn',
      value: pomApiGateway.restApiName
    })
  }
}
