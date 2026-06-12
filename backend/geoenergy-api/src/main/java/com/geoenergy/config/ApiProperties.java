package com.geoenergy.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApiProperties {
  @Value("${geoenergy.news-api-key:}")
  private String newsApiKey;

  @Value("${geoenergy.alpha-vantage-api-key:}")
  private String alphaVantageApiKey;

  @Value("${geoenergy.eia-api-key:}")
  private String eiaApiKey;

  public String newsApiKey() {
    return newsApiKey == null ? "" : newsApiKey.trim();
  }

  public String alphaVantageApiKey() {
    return alphaVantageApiKey == null ? "" : alphaVantageApiKey.trim();
  }

  public String eiaApiKey() {
    return eiaApiKey == null ? "" : eiaApiKey.trim();
  }
}
