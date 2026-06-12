package com.geoenergy.model;

import java.time.Instant;
import java.util.List;

public record LiveFeedItem(
  String id,
  Instant timestamp,
  String title,
  String source,
  String url,
  String sector,
  String impact,
  String sentimentEffect,
  String whyItMatters,
  String context,
  String marketReadThrough,
  List<String> relatedRegions,
  List<String> relatedSectors,
  String region,
  String eventType,
  boolean isBreaking,
  int priority
) {}
