package com.geoenergy.model;

import java.time.Instant;

public record MarketPulse(
  String marketDirection,
  String globalRiskLevel,
  String mostAffectedSector,
  String keyRegion,
  String biggestEvent,
  Instant lastUpdated,
  String systemStatus,
  int analysisConfidence,
  String cycleId
) {}
