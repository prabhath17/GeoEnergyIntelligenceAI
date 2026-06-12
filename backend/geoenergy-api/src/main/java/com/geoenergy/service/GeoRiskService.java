package com.geoenergy.service;

import com.geoenergy.dto.GeoRiskResult;
import com.geoenergy.model.GeoRiskItem;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class GeoRiskService {
  public GeoRiskResult fetchGeoRisk() {
    long t0 = System.currentTimeMillis();
    return new GeoRiskResult("mock", "Java Rule-Based GeoRisk", System.currentTimeMillis() - t0, mockGeoRisk());
  }

  public List<GeoRiskItem> mockGeoRisk() {
    Instant now = Instant.now();
    return List.of(
      risk("geo-001", "Middle East", "Strait of Hormuz", List.of(26.5, 56.5), 10.0, "Critical", List.of("Crude Oil", "Refined Products", "Natural Gas"), "Shipping Chokepoint", "Supply constraints could support Brent, diesel, and LNG-linked prices. +$5-8 volatility projected.", now.minus(Duration.ofMinutes(4))),
      risk("geo-002", "Eastern Europe", "Ukraine / Russia Transit", List.of(50.0, 30.5), 8.4, "High", List.of("Natural Gas", "Power"), "Transit Risk", "Gas transit uncertainty may increase European power price volatility. EU storage withdrawals accelerating.", now.minus(Duration.ofMinutes(32))),
      risk("geo-003", "Middle East / Africa", "Red Sea Transit", List.of(20.0, 38.5), 8.0, "High", List.of("Refined Products", "Crude Oil"), "Maritime Insurance Risk", "Insurance premiums may raise shipping costs for refined product carriers.", now.minus(Duration.ofMinutes(16))),
      risk("geo-004", "North America", "Gulf Coast", List.of(29.0, -94.5), 6.6, "Moderate", List.of("Refined Products", "Crude Oil"), "Refinery Maintenance", "Seasonal refinery maintenance is tightening diesel and gasoline output.", now.minus(Duration.ofMinutes(21))),
      risk("geo-005", "North Africa", "Libya", List.of(27.0, 17.0), 7.4, "High", List.of("Crude Oil"), "Production Disruption", "Libyan field instability can reduce OPEC+ effective output and support Brent premium.", now.minus(Duration.ofHours(2))),
      risk("geo-006", "West Africa", "West Africa Offshore", List.of(6.5, 3.4), 6.9, "Moderate", List.of("Crude Oil", "Natural Gas"), "Export Reliability", "Port congestion and offshore loading risk can delay crude and LNG cargoes.", now.minus(Duration.ofHours(3)))
    );
  }

  private GeoRiskItem risk(String id, String region, String area, List<Double> coordinates, double score, String level,
                           List<String> sectors, String event, String impact, Instant timestamp) {
    return new GeoRiskItem(id, region, area, coordinates, score, level, sectors, event, impact, "Java GeoRisk Engine", true, timestamp);
  }
}
