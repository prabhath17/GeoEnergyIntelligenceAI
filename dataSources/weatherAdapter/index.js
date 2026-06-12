/**
 * Weather and power-demand adapter placeholders.
 * Weather API keys and grid-index credentials must remain behind backend proxy endpoints.
 */
export const weatherAdapter = {
  sources: ['Weather API', 'Power Demand Backend'],
  endpoint: '/api/proxy/weather',
  async fetchWeatherAndDemand() {
    return null;
  }
};
