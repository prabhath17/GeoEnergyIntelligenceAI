package com.geoenergy.service;

import com.geoenergy.dto.PriceResult;
import com.geoenergy.model.TickerItem;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PriceService {
  public PriceResult fetchPrices() {
    long t0 = System.currentTimeMillis();
    return new PriceResult("mock", "Java Mock Fallback", System.currentTimeMillis() - t0, mockEnergy(), mockCrossMarket());
  }

  public List<TickerItem> mockEnergy() {
    Instant now = Instant.now();
    return List.of(
      ticker("WTI", "WTI Crude", "WTI", 86.85, "USD/bbl", "$", -1.86, -2.1, "down", null, "WTI front-month benchmark.", List.of("Crude Oil"), "Java Rule Engine", now),
      ticker("BRENT", "Brent Crude", "BRENT", 91.16, "USD/bbl", "$", -2.72, -2.9, "down", null, "Brent benchmark for global crude trade.", List.of("Crude Oil"), "Java Rule Engine", now),
      ticker("NATGAS", "Natural Gas", "NG", 2.48, "USD/MMBtu", "$", 0.04, 1.6, "up", null, "Gas benchmark for power burn and LNG signals.", List.of("Natural Gas", "Power"), "Java Rule Engine", now),
      ticker("DIESEL", "Diesel", "HO", 3.11, "USD/gal", "$", 0.09, 3.0, "up", null, "Diesel cracks reflect refined-products tightness.", List.of("Refined Products"), "Java Rule Engine", now),
      ticker("GASOLINE", "Gasoline", "RB", 3.05, "USD/gal", "$", -0.13, -4.2, "down", null, "Gasoline futures track seasonal transport demand.", List.of("Refined Products"), "Java Rule Engine", now),
      ticker("EU_POWER", "Power Index (EU)", "EU-PWR", 94.22, "EUR/MWh", "€", 2.84, 3.1, "up", null, "European power index reflects gas, nuclear, and renewable mix.", List.of("Power"), "Java Rule Engine", now)
    );
  }

  public List<TickerItem> mockCrossMarket() {
    Instant now = Instant.now();
    return List.of(
      ticker("GOLD", "Gold", "GOLD", 4588.40, "USD/oz", "$", 89.30, 2.0, "up", "Safe-Haven", "Geopolitical fear / USD stress signal supports energy risk premium.", List.of("Crude Oil", "Natural Gas"), "Java Rule Engine", now),
      ticker("COPPER", "Copper", "COPPER", 6.38, "USD/lb", "$", -0.01, -0.2, "down", "Industrial Demand", "Global industrial and China demand signal.", List.of("Power", "Renewables"), "Java Rule Engine", now),
      ticker("WHEAT", "Wheat", "WHEAT", 611.00, "USc/bu", "", -13.16, -2.1, "down", "Food Inflation", "Black Sea supply risk links food inflation and fuel demand.", List.of("Refined Products", "Policy"), "Java Rule Engine", now),
      ticker("URANIUM", "Uranium", "URA", 50.81, "USD/share", "$", 0.65, 1.3, "up", "Nuclear Security", "Nuclear power renaissance and energy security demand.", List.of("Power", "Renewables"), "Java Rule Engine", now),
      ticker("LITHIUM", "Lithium", "LIT", 87.45, "USD/share", "$", 1.97, 2.3, "up", "EV Supply Chain", "EV battery demand and clean energy storage signal.", List.of("Renewables", "Power"), "Java Rule Engine", now)
    );
  }

  private TickerItem ticker(String id, String name, String symbol, double price, String unit, String currency,
                           double change, double changePercent, String direction, String signalType,
                           String whyItMatters, List<String> affectedSectors, String source, Instant timestamp) {
    return new TickerItem(id, name, symbol, price, unit, currency, change, changePercent, direction, signalType, whyItMatters, affectedSectors, source, timestamp);
  }
}
