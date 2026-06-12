package com.geoenergy.service;

import com.geoenergy.datasource.ExternalNewsClient;
import com.geoenergy.dto.NewsResult;
import com.geoenergy.model.NewsItem;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class NewsService {
  private final ExternalNewsClient externalNewsClient;
  private final ClassificationService classifier;

  public NewsService(ExternalNewsClient externalNewsClient, ClassificationService classifier) {
    this.externalNewsClient = externalNewsClient;
    this.classifier = classifier;
  }

  public NewsResult fetchNews() {
    long t0 = System.currentTimeMillis();
    try {
      List<NewsItem> live = externalNewsClient.fetchEnergyArticles().stream()
        .map(this::toNewsItem)
        .filter(item -> classifier.isEnergyRelevantHeadline(item.headline(), item.context()))
        .toList();
      List<NewsItem> deduped = dedupe(live);
      if (!deduped.isEmpty()) return new NewsResult("live", "NewsAPI", System.currentTimeMillis() - t0, deduped);
    } catch (Exception ignored) {
      // Fall through to portfolio-safe mock data.
    }
    return new NewsResult("mock", "Java Mock Fallback", System.currentTimeMillis() - t0, mockNews());
  }

  public List<NewsItem> mockNews() {
    Instant now = Instant.now();
    return List.of(
      news("news-001", "High Impact", "Critical risk - Strait of Hormuz shipping chokepoint", "Live Headlines-Derived", now.minus(Duration.ofMinutes(4)), "Supply constraints could support Brent, diesel, and LNG-linked prices. +$5-8 volatility projected.", "Strait of Hormuz tanker throughput is being watched for crude oil and refined-products supply risk."),
      news("news-002", "Medium Impact", "EU natural gas injection season slowing - demand uptick flagged", "Storage Monitor", now.minus(Duration.ofMinutes(8)), "Slower injections could reduce EU buffer ahead of winter.", "European natural gas storage and power demand remain linked to regional price volatility."),
      news("news-003", "Medium Impact", "ENTSO-E warns of grid congestion risk in Germany for weekend", "ENTSO-E", now.minus(Duration.ofMinutes(12)), "Weekend renewable surplus may strain balancing capacity in the German grid.", "Power grid congestion and renewables output are affecting day-ahead power market risk."),
      news("news-004", "High Impact", "High risk - Red Sea transit maritime insurance risk", "Live Headlines-Derived", now.minus(Duration.ofMinutes(16)), "Insurance premiums may raise shipping costs for refined product carriers.", "Red Sea transit risk affects tanker routing, diesel cargo timing, and refined-products freight."),
      news("news-005", "High Impact", "Gulf Coast refinery maintenance lifts diesel crack spreads", "Refinery Monitor", now.minus(Duration.ofMinutes(21)), "Seasonal refinery work is tightening diesel output and widening cracks.", "Refinery utilization is a direct refined-products market signal."),
      news("news-006", "Medium Impact", "Uranium strength reinforces nuclear security trade", "Cross-Market Monitor", now.minus(Duration.ofMinutes(27)), "Nuclear fuel demand supports long-term power-market security themes.", "Uranium and nuclear power are supporting energy-security portfolio signals.")
    );
  }

  private NewsItem toNewsItem(Map<String, Object> article) {
    String headline = str(article.get("title"));
    String description = str(article.get("description"));
    String source = "NewsAPI";
    Object sourceObj = article.get("source");
    if (sourceObj instanceof Map<?, ?> map && map.get("name") != null) source = str(map.get("name"));
    Instant ts = parseInstant(str(article.get("publishedAt")));
    return news("newsapi-" + Math.abs(headline.hashCode()), classifier.impact(headline + " " + description), headline, source, ts, description, description);
  }

  private NewsItem news(String id, String impact, String headline, String source, Instant timestamp, String why, String context) {
    String text = headline + " " + context;
    String sector = classifier.sector(text);
    String category = classifier.category(text);
    String region = classifier.region(text);
    String sentiment = classifier.sentimentEffect(text, sector);
    List<String> relatedSectors = "Policy".equals(sector) ? List.of() : List.of(sector);
    List<String> relatedRegions = "Global".equals(region) ? List.of() : List.of(region);
    return new NewsItem(id, impact, headline, source, "", timeAgo(timestamp), timestamp, sector, category, region,
      sentiment, why, context, marketReadThrough(text, sector), relatedRegions, relatedSectors, classifier.relevanceScore(headline, context));
  }

  private List<NewsItem> dedupe(List<NewsItem> items) {
    Map<String, NewsItem> byHeadline = new LinkedHashMap<>();
    for (NewsItem item : items) {
      byHeadline.putIfAbsent(item.headline().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim(), item);
    }
    return new ArrayList<>(byHeadline.values());
  }

  private String marketReadThrough(String text, String sector) {
    if ("Crude Oil".equals(sector)) return "Watch Brent/WTI spreads, tanker flows, refinery feedstock costs, and inventories for confirmation.";
    if ("Natural Gas".equals(sector)) return "Watch storage changes, LNG cargo routing, pipeline flow data, and power-sector gas burn.";
    if ("Refined Products".equals(sector)) return "Watch diesel and gasoline cracks, refinery utilization, and wholesale rack prices.";
    if ("Power".equals(sector)) return "Watch day-ahead power prices, interconnector flows, nuclear availability, and grid congestion.";
    if ("Renewables".equals(sector)) return "Watch curtailment, battery availability, grid congestion, and policy updates.";
    return "Watch price reaction, volume, and follow-on policy or supply updates.";
  }

  private Instant parseInstant(String raw) {
    try { return Instant.parse(raw); } catch (Exception e) { return Instant.now(); }
  }

  private String timeAgo(Instant ts) {
    long minutes = Math.max(0, Duration.between(ts, Instant.now()).toMinutes());
    if (minutes < 1) return "Just now";
    if (minutes < 60) return minutes + " min" + (minutes == 1 ? "" : "s") + " ago";
    long hours = minutes / 60;
    if (hours < 24) return hours + " hour" + (hours == 1 ? "" : "s") + " ago";
    long days = hours / 24;
    return days + " day" + (days == 1 ? "" : "s") + " ago";
  }

  private String str(Object value) {
    return value == null ? "" : String.valueOf(value);
  }
}
