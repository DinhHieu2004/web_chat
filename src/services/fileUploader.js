
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: import.meta.env.VITE_AWS_REGION,
    credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_KEY,
    },
});

const BUCKET = import.meta.env.VITE_S3_BUCKET;

export const uploadFileToS3 = async (file) => {
    if (!file) return null;

    const safeName = encodeURIComponent(file.name);
    const key = `uploads/${Date.now()}-${safeName}`;

    try {
        const fileContent = await file.arrayBuffer();

        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: fileContent,
                ContentType: file.type || "application/octet-stream",
            })
        );
        console.log(`https://${BUCKET}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${key}`)

        return `https://${BUCKET}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${key}`;
    } catch (err) {
        console.error("Upload S3 lỗi:", err);
        return null;
    }
};

