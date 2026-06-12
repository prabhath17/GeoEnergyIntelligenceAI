package com.geoenergy.model;

import java.time.Instant;

public record DataSourceHealth(
  String status,
  String label,
  String source,
  String endpoint,
  Long latencyMs,
  Instant lastSync
) {}
