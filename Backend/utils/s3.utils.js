import AWS from 'aws-sdk';

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
});

// Upload a file buffer to S3
export async function uploadFileToS3({ bucket, key, buffer, contentType }) {
    const params = {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    };
    return await s3.upload(params).promise();
}

// Download a file from S3
export async function getFileFromS3({ bucket, key }) {
    const params = {
        Bucket: bucket,
        Key: key,
    };
    return await s3.getObject(params).promise();
}

// Delete a file from S3
export async function deleteFileFromS3({ bucket, key }) {
    const params = {
        Bucket: bucket,
        Key: key,
    };
    return await s3.deleteObject(params).promise();
}

// Generate a signed URL for downloading a file
export function getSignedUrl({ bucket, key, expires = 60 * 5 }) {
    const params = {
        Bucket: bucket,
        Key: key,
        Expires: expires,
    };
    return s3.getSignedUrl('getObject', params);
}

// Generate a signed URL for uploading a file (PUT)
export function getSignedUploadUrl({ bucket, key, expires = 60 * 5, contentType }) {
    const params = {
        Bucket: bucket,
        Key: key,
        Expires: expires,
        ContentType: contentType,
    };
    return s3.getSignedUrl('putObject', params);
}

// Check if a file exists in S3
export async function fileExistsInS3({ bucket, key }) {
    try {
        await s3.headObject({ Bucket: bucket, Key: key }).promise();
        return true;
    } catch (err) {
        if (err.code === 'NotFound') return false;
        throw err;
    }
}

// Download a file from S3 as a stream
export function getFileStreamFromS3({ bucket, key }) {
    const params = { Bucket: bucket, Key: key };
    return s3.getObject(params).createReadStream();
}

// List all files in a bucket/prefix
export async function listFilesInS3({ bucket, prefix = '' }) {
    const params = {
        Bucket: bucket,
        Prefix: prefix,
    };
    return await s3.listObjectsV2(params).promise();
}

// Copy a file within S3
export async function copyFileInS3({ sourceBucket, sourceKey, destBucket, destKey }) {
    const params = {
        Bucket: destBucket,
        CopySource: `/${sourceBucket}/${sourceKey}`,
        Key: destKey,
    };
    return await s3.copyObject(params).promise();
}

// Move a file within S3 (copy then delete)
export async function moveFileInS3({ sourceBucket, sourceKey, destBucket, destKey }) {
    await copyFileInS3({ sourceBucket, sourceKey, destBucket, destKey });
    await deleteFileFromS3({ bucket: sourceBucket, key: sourceKey });
}
