import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export async function storageRoutes(fastify: FastifyInstance) {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    /**
     * POST /api/v1/storage/upload
     * Suporta upload Multipart/form-data e também Base64/Buffer
     */
    fastify.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const isMultipart = request.isMultipart();

            if (isMultipart) {
                const data = await request.file();
                if (!data) {
                    return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado.' });
                }

                const bucket = (data.fields.bucket as any)?.value || 'uploads';
                const bucketDir = path.join(uploadsDir, bucket);
                if (!fs.existsSync(bucketDir)) fs.mkdirSync(bucketDir, { recursive: true });

                const ext = path.extname(data.filename) || '.png';
                const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
                const savePath = path.join(bucketDir, filename);

                await pipeline(data.file, fs.createWriteStream(savePath));

                const host = request.headers.host || 'localhost:3333';
                const protocol = (request.headers['x-forwarded-proto'] as string) || (request.raw.socket as any).encrypted ? 'https' : 'http';
                const publicUrl = `${protocol}://${host}/uploads/${bucket}/${filename}`;

                return reply.send({
                    success: true,
                    url: publicUrl,
                    publicUrl,
                    filename,
                    bucket,
                });
            } else {
                // Fallback para JSON Base64 se enviado via fetch simples
                const body: any = request.body || {};
                const { fileData, fileName = 'upload.png', bucket = 'uploads' } = body;

                if (!fileData) {
                    return reply.status(400).send({ success: false, error: 'fileData (Base64) ou multipart é obrigatório.' });
                }

                const bucketDir = path.join(uploadsDir, bucket);
                if (!fs.existsSync(bucketDir)) fs.mkdirSync(bucketDir, { recursive: true });

                const ext = path.extname(fileName) || '.png';
                const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
                const savePath = path.join(bucketDir, uniqueName);

                const base64Data = fileData.replace(/^data:([A-Za-z-+/]+);base64,/, '');
                fs.writeFileSync(savePath, Buffer.from(base64Data, 'base64'));

                const host = request.headers.host || 'localhost:3333';
                const protocol = (request.headers['x-forwarded-proto'] as string) || (request.raw.socket as any).encrypted ? 'https' : 'http';
                const publicUrl = `${protocol}://${host}/uploads/${bucket}/${uniqueName}`;

                return reply.send({
                    success: true,
                    url: publicUrl,
                    publicUrl,
                    filename: uniqueName,
                    bucket,
                });
            }
        } catch (err: any) {
            console.error('[StorageUpload] Erro:', err);
            return reply.status(500).send({ success: false, error: err?.message || 'Falha no upload' });
        }
    });
}
