package com.geoenergy.dto;

import com.geoenergy.model.NewsItem;
import java.util.List;

public record NewsResult(
  String status,
  String source,
  long latencyMs,
  List<NewsItem> items
) {}
