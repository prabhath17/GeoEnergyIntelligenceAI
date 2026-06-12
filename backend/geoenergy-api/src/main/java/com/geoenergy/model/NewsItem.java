package com.geoenergy.model;

import java.time.Instant;
import java.util.List;

public record NewsItem(
  String id,
  String impact,
  String headline,
  String source,
  String url,
  String time,
  Instant timestamp,
  String sector,
  String category,
  String region,
  String sentimentEffect,
  String whyItMatters,
  String context,
  String marketReadThrough,
  List<String> relatedRegions,
  List<String> relatedSectors,
  int relevanceScore
) {}
