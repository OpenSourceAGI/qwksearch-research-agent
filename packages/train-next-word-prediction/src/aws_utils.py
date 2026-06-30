"""
AWS IAM Authentication and S3 Operations
Handles AWS credentials and S3 interactions for Fargate deployment
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class IAMAuthenticator:
    """Manages IAM authentication and AWS credentials"""
    
    def __init__(self):
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.environment = os.getenv('ENVIRONMENT', 'production')
        self.sts_client = boto3.client('sts', region_name=self.aws_region)
    
    def get_credentials_info(self) -> Dict[str, Any]:
        """Get information about current AWS credentials"""
        try:
            identity = self.sts_client.get_caller_identity()
            return {
                'account': identity['Account'],
                'arn': identity['Arn'],
                'user_id': identity['UserId']
            }
        except ClientError as e:
            logger.warning(f"Failed to get IAM credentials: {e}")
            return {}
    
    def verify_credentials(self) -> bool:
        """Verify AWS credentials are valid"""
        try:
            self.sts_client.get_caller_identity()
            logger.info("✓ AWS credentials verified")
            return True
        except ClientError as e:
            logger.error(f"✗ AWS credentials invalid: {e}")
            return False
    
    def get_role_arn(self) -> Optional[str]:
        """Get ARN of the task execution role"""
        try:
            identity = self.sts_client.get_caller_identity()
            # Extract role from ARN
            arn = identity['Arn']
            if 'role/' in arn:
                return arn
            return None
        except ClientError as e:
            logger.warning(f"Failed to get role ARN: {e}")
            return None


class S3Manager:
    """Manages S3 operations for model checkpoints and data"""
    
    def __init__(self, bucket: Optional[str] = None, prefix: str = 'transformer-training'):
        self.bucket = bucket or os.getenv('S3_BUCKET')
        self.prefix = prefix or os.getenv('S3_PREFIX', 'transformer-training')
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        
        if self.bucket:
            self.s3_client = boto3.client('s3', region_name=self.aws_region)
        else:
            self.s3_client = None
            logger.info("S3_BUCKET not configured, S3 operations disabled")
    
    def is_available(self) -> bool:
        """Check if S3 is configured and accessible"""
        if not self.bucket:
            return False
        
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
            return True
        except ClientError as e:
            logger.warning(f"S3 bucket not accessible: {e}")
            return False
    
    def list_checkpoints(self) -> list:
        """List available model checkpoints in S3"""
        if not self.s3_client:
            return []
        
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=f"{self.prefix}/checkpoints/",
                Delimiter='/'
            )
            
            checkpoints = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    key = obj['Key']
                    if key.endswith('.pt'):
                        checkpoints.append({
                            'key': key,
                            'size': obj['Size'],
                            'last_modified': obj['LastModified'].isoformat()
                        })
            
            return sorted(checkpoints, key=lambda x: x['last_modified'], reverse=True)
        except ClientError as e:
            logger.error(f"Failed to list checkpoints: {e}")
            return []
    
    def download_checkpoint(self, checkpoint_name: str, local_path: str) -> bool:
        """Download a checkpoint from S3"""
        if not self.s3_client:
            logger.warning("S3 not configured")
            return False
        
        try:
            key = f"{self.prefix}/checkpoints/{checkpoint_name}"
            logger.info(f"Downloading checkpoint from s3://{self.bucket}/{key}")
            
            self.s3_client.download_file(self.bucket, key, local_path)
            logger.info(f"✓ Checkpoint downloaded to {local_path}")
            return True
        except ClientError as e:
            logger.error(f"Failed to download checkpoint: {e}")
            return False
    
    def upload_checkpoint(self, local_path: str, checkpoint_name: str) -> bool:
        """Upload a checkpoint to S3"""
        if not self.s3_client:
            logger.warning("S3 not configured")
            return False
        
        try:
            key = f"{self.prefix}/checkpoints/{checkpoint_name}"
            logger.info(f"Uploading checkpoint to s3://{self.bucket}/{key}")
            
            self.s3_client.upload_file(local_path, self.bucket, key)
            logger.info(f"✓ Checkpoint uploaded to {key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to upload checkpoint: {e}")
            return False
    
    def sync_directory(self, local_dir: str, s3_prefix: str, direction: str = 'download') -> bool:
        """Sync directory to/from S3"""
        if not self.s3_client:
            logger.warning("S3 not configured")
            return False
        
        try:
            if direction == 'download':
                self._sync_from_s3(local_dir, s3_prefix)
            elif direction == 'upload':
                self._sync_to_s3(local_dir, s3_prefix)
            else:
                raise ValueError(f"Invalid direction: {direction}")
            return True
        except Exception as e:
            logger.error(f"Failed to sync directory: {e}")
            return False
    
    def _sync_from_s3(self, local_dir: str, s3_prefix: str):
        """Download all objects from S3 prefix"""
        Path(local_dir).mkdir(parents=True, exist_ok=True)
        
        paginator = self.s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=self.bucket, Prefix=s3_prefix)
        
        for page in pages:
            if 'Contents' not in page:
                continue
            
            for obj in page['Contents']:
                key = obj['Key']
                local_file = os.path.join(local_dir, os.path.basename(key))
                logger.info(f"Downloading {key}")
                self.s3_client.download_file(self.bucket, key, local_file)
    
    def _sync_to_s3(self, local_dir: str, s3_prefix: str):
        """Upload all files from local directory to S3"""
        for root, dirs, files in os.walk(local_dir):
            for file in files:
                local_file = os.path.join(root, file)
                relative_path = os.path.relpath(local_file, local_dir)
                key = os.path.join(s3_prefix, relative_path)
                logger.info(f"Uploading {key}")
                self.s3_client.upload_file(local_file, self.bucket, key)


class FargateEnvironment:
    """Utilities for Fargate-specific environment checks"""
    
    @staticmethod
    def is_running_on_fargate() -> bool:
        """Check if running on AWS Fargate"""
        return 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI' in os.environ
    
    @staticmethod
    def is_running_on_ec2() -> bool:
        """Check if running on EC2"""
        try:
            import requests
            response = requests.get(
                'http://169.254.169.254/latest/meta-data/instance-id',
                timeout=1
            )
            return response.status_code == 200
        except:
            return False
    
    @staticmethod
    def get_container_metadata() -> Dict[str, Any]:
        """Get Fargate container metadata"""
        import requests
        
        metadata_uri = os.getenv('AWS_CONTAINER_CREDENTIALS_FULL_URI')
        if not metadata_uri:
            return {}
        
        try:
            response = requests.get(metadata_uri)
            return response.json()
        except:
            return {}
    
    @staticmethod
    def get_task_metadata() -> Dict[str, Any]:
        """Get Fargate task metadata"""
        import requests
        
        metadata_uri = os.getenv('ECS_CONTAINER_METADATA_URI_V4')
        if not metadata_uri:
            return {}
        
        try:
            response = requests.get(f"{metadata_uri}/task")
            return response.json()
        except:
            return {}


class ConfigManager:
    """Centralized configuration management"""
    
    @staticmethod
    def get_config() -> Dict[str, Any]:
        """Get complete configuration from environment"""
        return {
            'aws': {
                'region': os.getenv('AWS_REGION', 'us-east-1'),
                'profile': os.getenv('AWS_PROFILE'),
                'account_id': os.getenv('AWS_ACCOUNT_ID'),
            },
            'compute': {
                'type': os.getenv('COMPUTE_TYPE', 'cpu'),
                'cpu_units': os.getenv('CPU_UNITS', '1024'),
                'memory_mb': os.getenv('MEMORY_MB', '2048'),
                'gpu_count': int(os.getenv('GPU_COUNT', '0')),
            },
            'storage': {
                's3_bucket': os.getenv('S3_BUCKET'),
                's3_prefix': os.getenv('S3_PREFIX', 'transformer-training'),
                'data_path': os.getenv('DATA_PATH', '/data'),
                'checkpoint_path': os.getenv('MODEL_CHECKPOINT_PATH', '/data/checkpoints'),
            },
            'model': {
                'use_demo_mode': os.getenv('USE_DEMO_MODE', 'true').lower() == 'true',
                'mongo_host': os.getenv('MONGO_HOST', 'localhost'),
                'mongo_port': int(os.getenv('MONGO_PORT', '27017')),
            },
            'runtime': {
                'environment': os.getenv('ENVIRONMENT', 'production'),
                'port': int(os.getenv('PORT', '8080')),
                'log_level': os.getenv('LOG_LEVEL', 'info'),
                'is_fargate': FargateEnvironment.is_running_on_fargate(),
            }
        }
    
    @staticmethod
    def log_config():
        """Log current configuration (safe, no secrets)"""
        config = ConfigManager.get_config()
        
        logger.info("=" * 60)
        logger.info("Configuration Summary")
        logger.info("=" * 60)
        
        for section, values in config.items():
            logger.info(f"\n{section.upper()}:")
            for key, value in values.items():
                if 'secret' not in key.lower() and 'key' not in key.lower():
                    logger.info(f"  {key}: {value}")


# Convenience functions
def verify_aws_setup() -> bool:
    """Verify AWS setup is correct"""
    authenticator = IAMAuthenticator()
    
    logger.info("\n" + "=" * 60)
    logger.info("AWS Setup Verification")
    logger.info("=" * 60)
    
    # Check credentials
    if not authenticator.verify_credentials():
        return False
    
    # Get identity info
    creds = authenticator.get_credentials_info()
    if creds:
        logger.info(f"✓ Account: {creds['account']}")
        logger.info(f"✓ ARN: {creds['arn']}")
    
    # Check S3
    s3 = S3Manager()
    if s3.is_available():
        logger.info(f"✓ S3 Bucket: {s3.bucket}")
    else:
        logger.info("⚠ S3 not available (demo mode)")
    
    # Check if on Fargate
    if FargateEnvironment.is_running_on_fargate():
        logger.info("✓ Running on AWS Fargate")
        metadata = FargateEnvironment.get_task_metadata()
        if metadata:
            logger.info(f"  Task ARN: {metadata.get('TaskARN', 'unknown')}")
    else:
        logger.info("⚠ Not running on AWS Fargate")
    
    logger.info("=" * 60 + "\n")
    return True


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    
    # Run verification
    verify_aws_setup()
    
    # Log configuration
    ConfigManager.log_config()
