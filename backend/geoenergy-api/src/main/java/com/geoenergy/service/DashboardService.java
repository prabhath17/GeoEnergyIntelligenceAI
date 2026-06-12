package com.geoenergy.service;

import com.geoenergy.dto.DashboardResponse;
import com.geoenergy.dto.GeoRiskResult;
import com.geoenergy.dto.NewsResult;
import com.geoenergy.dto.PriceResult;
import com.geoenergy.model.DataSourceHealth;
import com.geoenergy.model.ExecutiveBriefing;
import com.geoenergy.model.GeoRiskItem;
import com.geoenergy.model.LiveFeedItem;
import com.geoenergy.model.MarketPulse;
import com.geoenergy.model.NewsItem;
import com.geoenergy.model.SectorScore;
import com.geoenergy.model.TickerItem;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
  private final PriceService priceService;
  private final NewsService newsService;
  private final GeoRiskService geoRiskService;

  public DashboardService(PriceService priceService, NewsService newsService, GeoRiskService geoRiskService) {
    this.priceService = priceService;
    this.newsService = newsService;
    this.geoRiskService = geoRiskService;
  }

  public DashboardResponse liveDashboard() {
    long t0 = System.currentTimeMillis();
    PriceResult prices = priceService.fetchPrices();
    NewsResult news = newsService.fetchNews();
    GeoRiskResult geoRisk = geoRiskService.fetchGeoRisk();
    List<SectorScore> sectors = sectorScores(prices.items(), news.items(), geoRisk.items());
    List<NewsItem> intelligence = news.items().stream()
      .sorted(Comparator.comparing(NewsItem::timestamp).reversed())
      .limit(8)
      .toList();
    List<LiveFeedItem> liveFeed = liveFeedItems(intelligence, geoRisk.items());
    MarketPulse pulse = marketPulse(sectors, geoRisk.items(), intelligence);
    ExecutiveBriefing briefing = briefing(pulse, sectors, geoRisk.items());
    boolean fallback = List.of(prices.status(), news.status(), geoRisk.status()).contains("mock");
    return new DashboardResponse(fallback ? "partial" : "live", fallback, Instant.now(), System.currentTimeMillis() - t0,
      dataSourceStatus(prices, news, geoRisk), pulse, prices.items(), sectors, prices.crossMarketSignals(),
      geoRisk.items(), liveFeed, intelligence, briefing);
  }

  public Map<String, Object> dataSourceStatus(PriceResult prices, NewsResult news, GeoRiskResult geoRisk) {
    Instant now = Instant.now();
    Map<String, Object> status = new LinkedHashMap<>();
    status.put("prices", health(prices.status(), prices.source(), "/api/proxy/prices", prices.latencyMs(), now));
    status.put("news", health(news.status(), news.source(), "/api/proxy/news", news.latencyMs(), now));
    status.put("geoRisk", health(geoRisk.status(), geoRisk.source(), "/api/proxy/georisk", geoRisk.latencyMs(), now));
    status.put("aiAnalysis", health("mock", "Java Rule Engine", "/api/dashboard/live", 0L, now));
    status.put("satellite", health("simulated", "Java GeoRisk Templates", "/api/proxy/georisk", 0L, now));
    status.put("lastSyncTime", now);
    return status;
  }

  private DataSourceHealth health(String status, String source, String endpoint, Long latencyMs, Instant now) {
    String label = "live".equals(status) ? "Live API" : "mock".equals(status) ? "Mock Fallback" : "Simulated";
    return new DataSourceHealth(status, label, source, endpoint, latencyMs, now);
  }

  private List<SectorScore> sectorScores(List<TickerItem> prices, List<NewsItem> news, List<GeoRiskItem> risks) {
    List<String> sectors = List.of("Crude Oil", "Natural Gas", "Refined Products", "Power", "Renewables");
    return sectors.stream().map(sector -> {
      long headlineHits = news.stream().filter(n -> sector.equals(n.sector()) || n.relatedSectors().contains(sector)).count();
      double riskMax = risks.stream().filter(r -> r.affectedSectors().contains(sector)).mapToDouble(GeoRiskItem::riskScore).max().orElse(4.0);
      double priceMove = prices.stream().filter(p -> p.affectedSectors() != null && p.affectedSectors().contains(sector)).mapToDouble(TickerItem::changePercent).average().orElse(0);
      int confidence = Math.max(55, Math.min(96, (int) Math.round(58 + headlineHits * 5 + riskMax * 2 + Math.abs(priceMove) * 2)));
      String sentiment = sentiment(sector, priceMove, riskMax, headlineHits);
      GeoRiskItem topRisk = risks.stream().filter(r -> r.affectedSectors().contains(sector)).max(Comparator.comparingDouble(GeoRiskItem::riskScore)).orElse(null);
      String riskLevel = riskMax >= 9 ? "Critical" : riskMax >= 7 ? "High" : riskMax >= 5 ? "Moderate" : "Low";
      return new SectorScore(idFor(sector), sector, sentiment, confidence, (priceMove >= 0 ? "+" : "") + String.format("%.1f%%", priceMove),
        riskLevel, reason(sector, sentiment), topRisk == null ? sector + " fundamentals" : topRisk.countryOrArea(),
        topRisk == null ? List.of("Global") : List.of(topRisk.region()), topRisk == null ? List.of("Price trend", "Headline density") : List.of(topRisk.eventType(), topRisk.marketImpact()),
        List.of(Math.max(45, confidence - 11), Math.max(45, confidence - 8), Math.max(45, confidence - 6), Math.max(45, confidence - 4), Math.max(45, confidence - 2), confidence),
        Instant.now());
    }).toList();
  }

  private List<LiveFeedItem> liveFeedItems(List<NewsItem> news, List<GeoRiskItem> risks) {
    List<LiveFeedItem> items = new ArrayList<>();
    for (NewsItem n : news) {
      items.add(new LiveFeedItem("lf-" + n.id(), n.timestamp(), n.headline(), n.source(), n.url(), n.sector(),
        n.impact(), n.sentimentEffect(), n.whyItMatters(), n.context(), n.marketReadThrough(),
        n.relatedRegions(), n.relatedSectors(), n.region(), n.category(), "High Impact".equals(n.impact()), "High Impact".equals(n.impact()) ? 1 : 2));
    }
    for (GeoRiskItem r : risks) {
      items.add(new LiveFeedItem("lf-" + r.id(), r.timestamp(), r.riskLevel() + " risk - " + r.countryOrArea() + ": " + r.eventType(),
        r.source(), "", r.affectedSectors().isEmpty() ? "Crude Oil" : r.affectedSectors().get(0),
        List.of("Critical", "High").contains(r.riskLevel()) ? "High Impact" : "Medium Impact", "Risk Elevated",
        r.marketImpact(), r.countryOrArea() + " is scored from rule-based geo-risk templates.", "Watch price action, shipping routes, insurance costs, and supply updates.",
        List.of(r.region()), r.affectedSectors(), r.region(), "Geo Risk", "Critical".equals(r.riskLevel()), "Critical".equals(r.riskLevel()) ? 1 : 2));
    }
    return items.stream().sorted(Comparator.comparingInt(LiveFeedItem::priority).thenComparing(LiveFeedItem::timestamp, Comparator.reverseOrder())).limit(14).toList();
  }

  private MarketPulse marketPulse(List<SectorScore> sectors, List<GeoRiskItem> risks, List<NewsItem> news) {
    SectorScore affected = sectors.stream().max(Comparator.comparingInt(SectorScore::confidence)).orElse(sectors.get(0));
    GeoRiskItem topRisk = risks.stream().max(Comparator.comparingDouble(GeoRiskItem::riskScore)).orElse(null);
    NewsItem event = news.stream().filter(n -> "High Impact".equals(n.impact())).findFirst().orElse(news.isEmpty() ? null : news.get(0));
    int avg = (int) sectors.stream().mapToInt(SectorScore::confidence).average().orElse(70);
    return new MarketPulse("Stable".equals(affected.sentiment()) ? "Stable" : "Stable-Bullish",
      topRisk != null && topRisk.riskScore() >= 9 ? "Elevated" : "Moderate", affected.sector(),
      topRisk == null ? "Global" : topRisk.countryOrArea(), event == null ? "Energy market update" : event.headline(),
      Instant.now(), "Nominal", avg, "CYCLE-" + Instant.now().toEpochMilli());
  }

  private ExecutiveBriefing briefing(MarketPulse pulse, List<SectorScore> sectors, List<GeoRiskItem> risks) {
    GeoRiskItem top = risks.stream().max(Comparator.comparingDouble(GeoRiskItem::riskScore)).orElse(null);
    return new ExecutiveBriefing("brief-" + Instant.now().toEpochMilli(),
      pulse.biggestEvent(),
      "Rule-based intelligence links current headlines, commodity moves, and geo-risk pressure into a market-ready operating view.",
      List.of("Strait of Hormuz tanker activity", "European gas storage and power prices", "Gulf Coast refinery yields", "Red Sea insurance premiums"),
      List.of("Monitor crude and refined-products upside risk.", "Track EU gas-to-power stress indicators.", "Watch uranium and lithium as energy-transition cross-signals."),
      Map.of("topRisk", top == null ? "None" : top.countryOrArea() + " - " + top.riskLevel() + " (" + top.riskScore() + ")", "watchFlag", pulse.mostAffectedSector(), "secondaryRisk", "Red Sea / Eastern Europe transit"),
      Instant.now(), pulse.cycleId(), "GEI-Java-Rules-1.0");
  }

  private String sentiment(String sector, double move, double risk, long hits) {
    if ("Renewables".equals(sector) && move >= 0) return "Expanding";
    if ("Power".equals(sector) && risk < 7) return "Steady";
    if (risk >= 8 || hits >= 2) return move < -1.5 ? "Volatile" : "Bullish";
    if (move < -1.0) return "Bearish";
    return "Neutral";
  }

  private String reason(String sector, String sentiment) {
    return "Live " + sector.toLowerCase() + " score uses Java rules across current prices, energy headlines, and active geo-risk templates. Current read: " + sentiment + ".";
  }

  private String idFor(String sector) {
    return sector.toLowerCase().replace(" ", "-");
  }
}
