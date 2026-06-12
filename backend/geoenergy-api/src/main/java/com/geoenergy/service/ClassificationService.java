package com.geoenergy.service;

import org.springframework.stereotype.Service;

@Service
public class ClassificationService {
  public String sector(String text) {
    String t = lower(text);
    if (t.matches(".*\\b(crude oil|wti|brent|opec|oil prices?|oil supply|oil demand|oil production|oil exports?|oil inventories|barrels?|bbl|tanker|petroleum)\\b.*")) return "Crude Oil";
    if (t.matches(".*\\b(natural gas|lng|gas price|gas supply|gas storage|pipeline)\\b.*")) return "Natural Gas";
    if (t.matches(".*\\b(diesel|gasoline|refinery|refineries|refining|crack spread|jet fuel|heating oil)\\b.*")) return "Refined Products";
    if (t.matches(".*\\b(power|electricity|grid|nuclear|generation|interconnector)\\b.*")) return "Power";
    if (t.matches(".*\\b(solar|wind|renewable|hydro|green energy|lithium|battery|ev demand|storage)\\b.*")) return "Renewables";
    return "Policy";
  }

  public String category(String text) {
    String t = lower(text);
    if (t.matches(".*\\b(sanction|ban|restriction|policy|meeting|opec)\\b.*")) return "Policy";
    if (t.matches(".*\\b(attack|conflict|war|strike|military|hormuz|red sea|transit)\\b.*")) return "Geo Risk";
    if (t.matches(".*\\b(supply chain|shipment|tanker|route|transit|port|refinery|pipeline)\\b.*")) return "Supply Chain";
    return "Market Move";
  }

  public String region(String text) {
    String t = lower(text);
    if (t.matches(".*\\b(hormuz|persian gulf|iran|uae|saudi|gulf)\\b.*")) return "Middle East";
    if (t.matches(".*\\b(russia|ukraine|eastern europe|moscow)\\b.*")) return "Eastern Europe";
    if (t.matches(".*\\b(red sea|suez|houthi|yemen)\\b.*")) return "Middle East / Africa";
    if (t.matches(".*\\b(libya|nigeria|west africa)\\b.*")) return "Africa";
    if (t.matches(".*\\b(gulf coast|texas|usa|north america)\\b.*")) return "North America";
    if (t.matches(".*\\b(europe|eu |germany|france|uk |britain)\\b.*")) return "Europe";
    return "Global";
  }

  public String impact(String text) {
    String t = lower(text);
    if (t.matches(".*\\b(critical|breaking|major|surge|plunge|spike|crisis|attack|strike|disruption|force majeure|emergency|outage)\\b.*")) return "High Impact";
    if (t.matches(".*\\b(minor|slight|small|marginal|routine|planned)\\b.*")) return "Low Impact";
    return "Medium Impact";
  }

  public String sentimentEffect(String text, String sector) {
    String t = lower(text);
    if (t.matches(".*\\b(disruption|outage|tight|draw|drop|force majeure|sanction|risk|spike|higher|rises?)\\b.*")) return "Bullish";
    if (t.matches(".*\\b(surplus|high storage|weak demand|oversupply|falls?|lower|declines?)\\b.*")) return "Bearish";
    if ("Policy".equals(sector) || t.matches(".*\\b(opec|policy|sanction|meeting)\\b.*")) return "Volatile";
    return "Neutral";
  }

  public int relevanceScore(String headline, String description) {
    String text = (headline + " " + description);
    String t = lower(text);
    if (t.matches(".*\\b(crude bombs?|crude weapons?|group clash|police arrested|arrested|crime|violence|murder|celebrity|sports)\\b.*")) return 0;
    int score = 0;
    if (t.matches(".*\\b(crude oil|oil prices?|brent|wti|opec|barrels?|bbl|refinery|refineries|oil production|oil supply|oil demand|oil exports?|oil inventories|tanker|petroleum|fuel markets?|diesel|gasoline|natural gas|lng|power grid|electricity|renewables?|solar|wind|nuclear|uranium|lithium|battery|pipeline|sanctions?|hormuz|red sea)\\b.*")) score += 2;
    if (t.matches(".*\\b(price|prices|market|markets|futures?|supply|demand|exports?|inventor(y|ies)|production|shipping|barrels?|grid|power|sanction|geopolitical|volatility|crack spread|storage|outage|force majeure)\\b.*")) score += 1;
    if (t.matches(".*\\b(energy|commodity|commodities|oil|gas|fuel|diesel|gasoline|power|electricity|renewable|solar|wind|nuclear|uranium|lithium|pipeline|refinery|tanker|lng)\\b.*")) score += 1;
    if (t.matches(".*\\bcrude\\b.*") && !t.matches(".*\\bcrude oil\\b.*")) score -= 2;
    return Math.max(0, score);
  }

  public boolean isEnergyRelevantHeadline(String headline, String description) {
    return relevanceScore(headline == null ? "" : headline, description == null ? "" : description) >= 2;
  }

  private String lower(String text) {
    return text == null ? "" : text.toLowerCase();
  }
}
