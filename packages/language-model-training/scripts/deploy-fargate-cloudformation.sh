#!/bin/bash

###############################################################################
# AWS CloudFormation Deployment Script for Fargate
# Creates VPC, subnets, security groups, ECS cluster, and services
###############################################################################

set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-default}"
STACK_NAME="${STACK_NAME:-transformer-training-stack}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
COMPUTE_TYPE="${COMPUTE_TYPE:-cpu}"

echo "Deploying CloudFormation stack: $STACK_NAME"
echo "Region: $AWS_REGION"
echo "Compute Type: $COMPUTE_TYPE"

# CloudFormation Template
TEMPLATE=$(cat <<'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS Fargate Infrastructure for Transformer Model Training'

Parameters:
  EnvironmentName:
    Type: String
    Default: dev
    Description: Environment name prefix
  
  ComputeType:
    Type: String
    Default: cpu
    AllowedValues:
      - cpu
      - gpu
      - gpu-spot
    Description: Compute type (cpu, gpu, or gpu-spot)

Resources:
  # VPC
  TransformerVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-transformer-vpc'

  # Public Subnet 1
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref TransformerVPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-public-subnet-1'

  # Public Subnet 2
  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref TransformerVPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-public-subnet-2'

  # Private Subnet 1 (for data)
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref TransformerVPC
      CidrBlock: 10.0.10.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-private-subnet-1'

  # Private Subnet 2 (for data)
  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref TransformerVPC
      CidrBlock: 10.0.11.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-private-subnet-2'

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-igw'

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref TransformerVPC
      InternetGatewayId: !Ref InternetGateway

  # Public Route Table
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref TransformerVPC
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-public-rt'

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet2
      RouteTableId: !Ref PublicRouteTable

  # Security Group for Fargate Tasks
  FargateSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Fargate tasks
      VpcId: !Ref TransformerVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8080
          ToPort: 8080
          CidrIp: 0.0.0.0/0
          Description: HTTP API
        - IpProtocol: tcp
          FromPort: 8888
          ToPort: 8888
          CidrIp: 0.0.0.0/0
          Description: Jupyter
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-fargate-sg'

  # Security Group for MongoDB
  MongoDBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for MongoDB
      VpcId: !Ref TransformerVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 27017
          ToPort: 27017
          SourceSecurityGroupId: !Ref FargateSecurityGroup
          Description: MongoDB from Fargate
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-mongodb-sg'

  # CloudWatch Log Group
  LogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/ecs/${EnvironmentName}-transformer'
      RetentionInDays: 30

  # IAM Role - Task Execution
  TaskExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'
      Policies:
        - PolicyName: CloudWatchLogs
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - 'logs:CreateLogStream'
                  - 'logs:PutLogEvents'
                Resource: !GetAtt LogGroup.Arn

  # IAM Role - Task (for S3 access)
  TaskRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: 'sts:AssumeRole'
      Policies:
        - PolicyName: S3Access
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - 's3:GetObject'
                  - 's3:PutObject'
                  - 's3:DeleteObject'
                  - 's3:ListBucket'
                Resource: '*'
        - PolicyName: ECSExecAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - 'ssmmessages:CreateControlChannel'
                  - 'ssmmessages:CreateDataChannel'
                  - 'ssmmessages:OpenControlChannel'
                  - 'ssmmessages:OpenDataChannel'
                  - 'logs:DescribeLogGroups'
                Resource: '*'

  # ECS Cluster
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub '${EnvironmentName}-transformer'
      CapacityProviders:
        - FARGATE
        - FARGATE_SPOT
      DefaultCapacityProviderStrategy:
        - CapacityProvider: FARGATE
          Weight: 1

  # ECS Task Definition
  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub '${EnvironmentName}-transformer'
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      Cpu: '1024'
      Memory: '2048'
      ExecutionRoleArn: !GetAtt TaskExecutionRole.Arn
      TaskRoleArn: !GetAtt TaskRole.Arn
      ContainerDefinitions:
        - Name: transformer
          Image: !Sub '${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/train-next-word-prediction:latest'
          Essential: true
          PortMappings:
            - ContainerPort: 8080
              Protocol: tcp
            - ContainerPort: 8888
              Protocol: tcp
          Environment:
            - Name: COMPUTE_TYPE
              Value: !Ref ComputeType
            - Name: USE_DEMO_MODE
              Value: 'true'
            - Name: AWS_REGION
              Value: !Ref AWS::Region
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: transformer

  # ECS Service
  ECSService:
    Type: AWS::ECS::Service
    DependsOn: TaskDefinition
    Properties:
      ServiceName: !Sub '${EnvironmentName}-transformer-service'
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: 1
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          Subnets:
            - !Ref PublicSubnet1
            - !Ref PublicSubnet2
          SecurityGroups:
            - !Ref FargateSecurityGroup
          AssignPublicIp: ENABLED

Outputs:
  VPCId:
    Value: !Ref TransformerVPC
    Export:
      Name: !Sub '${EnvironmentName}-VPC-ID'
  
  PublicSubnet1:
    Value: !Ref PublicSubnet1
    Export:
      Name: !Sub '${EnvironmentName}-PublicSubnet1'
  
  PublicSubnet2:
    Value: !Ref PublicSubnet2
    Export:
      Name: !Sub '${EnvironmentName}-PublicSubnet2'
  
  FargateSecurityGroup:
    Value: !Ref FargateSecurityGroup
    Export:
      Name: !Sub '${EnvironmentName}-FargateSecurityGroup'
  
  ECSCluster:
    Value: !Ref ECSCluster
    Export:
      Name: !Sub '${EnvironmentName}-ECSCluster'
  
  ECSService:
    Value: !GetAtt ECSService.Name
    Export:
      Name: !Sub '${EnvironmentName}-ECSService'
  
  LogGroup:
    Value: !Ref LogGroup
    Export:
      Name: !Sub '${EnvironmentName}-LogGroup'
EOF
)

# Save template to file
echo "$TEMPLATE" > /tmp/fargate-template.yaml

# Deploy stack
aws cloudformation deploy \
    --template-file /tmp/fargate-template.yaml \
    --stack-name "$STACK_NAME" \
    --parameter-overrides EnvironmentName="$ENVIRONMENT" ComputeType="$COMPUTE_TYPE" \
    --capabilities CAPABILITY_NAMED_IAM \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --no-fail-on-empty-changeset

echo "✓ Stack deployment initiated"

# Get outputs
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs' \
    --output table
