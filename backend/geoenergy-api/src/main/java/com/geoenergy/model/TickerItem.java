package com.geoenergy.model;

import java.time.Instant;
import java.util.List;

public record TickerItem(
  String id,
  String name,
  String symbol,
  double price,
  String unit,
  String currency,
  double change,
  double changePercent,
  String direction,
  String signalType,
  String whyItMatters,
  List<String> affectedSectors,
  String source,
  Instant timestamp
) {}
