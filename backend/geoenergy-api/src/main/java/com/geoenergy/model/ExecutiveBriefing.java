package com.geoenergy.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ExecutiveBriefing(
  String id,
  String whatChanged,
  String whyItMatters,
  List<String> whatToWatchNext,
  List<String> strategyBrief,
  Map<String, String> riskSummary,
  Instant generatedAt,
  String cycleId,
  String modelVersion
) {}
