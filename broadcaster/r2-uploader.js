require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const config = {
  bucketName: process.env.R2_BUCKET_NAME,
  cdnHostname: process.env.CDN_HOSTNAME,
};

/**
 * Verify R2 connection is working
 */
async function verifyR2Connection() {
  try {
    // Try a simple head bucket operation by checking if a test object exists
    const testKey = 'connection-test.txt';
    
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: testKey,
      }));
    } catch (err) {
      // 404 is fine, means we can connect but object doesn't exist
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return true;
      }
      throw err;
    }
    
    return true;
  } catch (error) {
    console.error('R2 Connection Error:', error.message);
    throw new Error(`Failed to verify R2 connection: ${error.message}`);
  }
}

/**
 * Upload a file to Cloudflare R2
 * @param {string} filePath - Local file path
 * @param {string} key - R2 object key (path)
 * @returns {string|null} - Public URL if successful, null if failed
 */
async function uploadToR2(filePath, key) {
  try {
    // Read file
    const fileContent = fs.readFileSync(filePath);
    const fileSize = fs.statSync(filePath).size;

    // Determine content type
    const contentType = key.endsWith('.ts') ? 'video/mp2t' : 
                       key.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' :
                       'application/octet-stream';

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: 'public, max-age=300', // 5 minute cache
    });

    await s3Client.send(command);

    // Construct public URL
    const publicUrl = `https://${config.cdnHostname}/${key}`;

    // Verify upload (optional but recommended)
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      });
      const headResult = await s3Client.send(headCommand);
      
      if (headResult.ContentLength !== fileSize) {
        console.warn(`⚠️  Size mismatch: local=${fileSize}, R2=${headResult.ContentLength}`);
      }
    } catch (verifyErr) {
      console.warn(`⚠️  Could not verify upload: ${verifyErr.message}`);
    }

    return publicUrl;
  } catch (error) {
    console.error(`❌ R2 upload failed for ${key}:`, error.message);
    
    // Log more details for debugging
    if (error.$metadata) {
      console.error('   HTTP Status:', error.$metadata.httpStatusCode);
      console.error('   Request ID:', error.$metadata.requestId);
    }
    
    return null;
  }
}

/**
 * Delete a file from R2
 * @param {string} key - R2 object key to delete
 * @returns {boolean} - True if successful
 */
async function deleteFromR2(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error(`❌ R2 delete failed for ${key}:`, error.message);
    return false;
  }
}

/**
 * Check if a file exists in R2
 * @param {string} key - R2 object key
 * @returns {boolean} - True if exists
 */
async function existsInR2(key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }));
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    console.error(`❌ R2 check failed for ${key}:`, error.message);
    return false;
  }
}

module.exports = {
  verifyR2Connection,
  uploadToR2,
  deleteFromR2,
  existsInR2,
  s3Client,
};

