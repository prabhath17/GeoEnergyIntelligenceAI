package com.geoenergy.dto;

import com.geoenergy.model.TickerItem;
import java.util.List;

public record PriceResult(
  String status,
  String source,
  long latencyMs,
  List<TickerItem> items,
  List<TickerItem> crossMarketSignals
) {}
