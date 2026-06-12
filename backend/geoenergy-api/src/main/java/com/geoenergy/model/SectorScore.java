package com.geoenergy.model;

import java.time.Instant;
import java.util.List;

public record SectorScore(
  String id,
  String sector,
  String sentiment,
  int confidence,
  String changeVsYesterday,
  String riskLevel,
  String reason,
  String watchItem,
  List<String> affectedRegions,
  List<String> topRiskFactors,
  List<Integer> sparklineData,
  Instant lastUpdated
) {}
