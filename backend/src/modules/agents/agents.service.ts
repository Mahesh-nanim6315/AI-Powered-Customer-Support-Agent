import { AgentRepository } from "./agents.repository";

export class AgentService {

  static async createAgent(userId: string, specialization?: string) {
    return AgentRepository.create(userId, specialization);
  }

  static async assignAgent(orgId: string) {
    const agents = await AgentRepository.findAvailableAgents(orgId);

    if (!agents.length) {
      return null;
    }

    const selectedAgent = agents[0];

    await AgentRepository.incrementLoad(selectedAgent.id);

    return selectedAgent;
  }
}