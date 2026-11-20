import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env';

export async function verifyAgentKey(request: FastifyRequest, reply: FastifyReply) {
    const agentKey = request.headers['x-vox-agent-key'] ||
        (request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.split(' ')[1] : null);

    if (!agentKey || agentKey !== env.AGENT_API_KEY) {
        return reply.status(401).send({
            success: false,
            error: 'Não autorizado. Forneça uma chave de agente válida no cabeçalho x-vox-agent-key.',
        });
    }
}
