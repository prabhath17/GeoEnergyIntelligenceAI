package com.geoenergy.dto;

import com.geoenergy.model.GeoRiskItem;
import java.util.List;

public record GeoRiskResult(
  String status,
  String source,
  long latencyMs,
  List<GeoRiskItem> items
) {}
