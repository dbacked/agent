# AWS S3 Configuration

This page is only useful if you are using DBacked Free as the Pro version take care of this for you.

When using DBacked Free you need a Amazon Web Services account to store your backups on [S3](https://aws.amazon.com/s3/). AWS S3 provides a free-tier: 5 GB of Amazon S3 storage in the Standard Storage class, 20,000 Get Requests, 2,000 Put Requests, and 15 GB of data transfer out each month for one year. After this, you'll be billed according to what's on their [pricing](https://aws.amazon.com/s3/pricing/) page.

You first need to create a new S3 bucket, you can refer to [their tutorial on how to create a S3 bucket](https://docs.aws.amazon.com/quickstarts/latest/s3backup/step-1-create-bucket.html).

To allow the DBacked agent to manage this bucket, you need to create a set of credentials.

## Creating a dedicated IAM key

You need to create a IAM user with programmatic access. Its name doesn't matter but you should make use something that is recognizable. Refer to their [tutorial about creating a IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console).

This new user permissions should be restricted to the bucket you created to prevent problems if the key is leaked. The basic policy is declared like this:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:AbortMultipartUpload",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": "s3:HeadBucket",
            "Resource": "arn:aws:s3:::*"
        }
    ]
}
```

This policy will also prevent this key to delete any file in the bucket.
