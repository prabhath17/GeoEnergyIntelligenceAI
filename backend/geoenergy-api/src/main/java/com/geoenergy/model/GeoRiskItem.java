package com.geoenergy.model;

import java.time.Instant;
import java.util.List;

public record GeoRiskItem(
  String id,
  String region,
  String countryOrArea,
  List<Double> coordinates,
  double riskScore,
  String riskLevel,
  List<String> affectedSectors,
  String eventType,
  String marketImpact,
  String source,
  boolean isActive,
  Instant timestamp
) {}
