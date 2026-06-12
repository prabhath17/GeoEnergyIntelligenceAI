package com.geoenergy.dto;

import com.geoenergy.model.DataSourceHealth;
import com.geoenergy.model.ExecutiveBriefing;
import com.geoenergy.model.GeoRiskItem;
import com.geoenergy.model.LiveFeedItem;
import com.geoenergy.model.MarketPulse;
import com.geoenergy.model.NewsItem;
import com.geoenergy.model.SectorScore;
import com.geoenergy.model.TickerItem;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record DashboardResponse(
  String mode,
  boolean fallbackActive,
  Instant lastSync,
  long latencyMs,
  Map<String, Object> dataSourceStatus,
  MarketPulse marketPulse,
  List<TickerItem> tickerItems,
  List<SectorScore> sectorScores,
  List<TickerItem> crossMarketSignals,
  List<GeoRiskItem> geoRiskItems,
  List<LiveFeedItem> liveFeedItems,
  List<NewsItem> intelligenceFeed,
  ExecutiveBriefing executiveBriefing
) {}
