package com.geoenergy.datasource;

import com.geoenergy.config.ApiProperties;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class ExternalNewsClient {
  private final ApiProperties properties;
  private final WebClient webClient;

  public ExternalNewsClient(ApiProperties properties, WebClient.Builder builder) {
    this.properties = properties;
    this.webClient = builder.baseUrl("https://newsapi.org").build();
  }

  @SuppressWarnings("unchecked")
  public List<Map<String, Object>> fetchEnergyArticles() {
    if (properties.newsApiKey().isBlank()) return List.of();
    String query = "crude oil OR WTI OR Brent OR OPEC OR natural gas OR LNG OR refinery OR diesel OR gasoline OR power grid OR renewables OR uranium OR lithium";
    Map<String, Object> body = webClient.get()
      .uri(uri -> uri.path("/v2/everything")
        .queryParam("q", query)
        .queryParam("language", "en")
        .queryParam("sortBy", "publishedAt")
        .queryParam("pageSize", "20")
        .queryParam("from", Instant.now().minus(12, ChronoUnit.HOURS).toString())
        .queryParam("apiKey", properties.newsApiKey())
        .build())
      .retrieve()
      .bodyToMono(Map.class)
      .block();
    Object articles = body == null ? null : body.get("articles");
    return articles instanceof List<?> list ? (List<Map<String, Object>>) list : List.of();
  }
}
