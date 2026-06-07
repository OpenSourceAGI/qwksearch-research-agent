import configManager from "./config-manager";

export default class ModelRegistry {
  async getActiveProviders() {
    return configManager.getCurrentConfig().modelProviders;
  }

  async addProvider(type: string, config: any) {
    return configManager.addModelProvider(type, config);
  }

  async removeProvider(id: string) {
    configManager.removeModelProvider(id);
  }

  async updateProvider(id: string, config: any) {
    return configManager.updateModelProvider(id, config);
  }

  async addProviderModel(providerId: string, type: "chat", model: any) {
    return configManager.addProviderModel(providerId, type, model);
  }

  async removeProviderModel(providerId: string, type: "chat", modelKey: string) {
    configManager.removeProviderModel(providerId, type, modelKey);
  }
}
