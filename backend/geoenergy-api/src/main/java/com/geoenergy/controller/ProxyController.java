package com.geoenergy.controller;

import com.geoenergy.dto.GeoRiskResult;
import com.geoenergy.dto.NewsResult;
import com.geoenergy.dto.PriceResult;
import com.geoenergy.service.GeoRiskService;
import com.geoenergy.service.NewsService;
import com.geoenergy.service.PriceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/proxy")
public class ProxyController {
  private final PriceService priceService;
  private final NewsService newsService;
  private final GeoRiskService geoRiskService;

  public ProxyController(PriceService priceService, NewsService newsService, GeoRiskService geoRiskService) {
    this.priceService = priceService;
    this.newsService = newsService;
    this.geoRiskService = geoRiskService;
  }

  @GetMapping("/prices")
  public PriceResult prices() {
    return priceService.fetchPrices();
  }

  @GetMapping("/news")
  public NewsResult news() {
    return newsService.fetchNews();
  }

  @GetMapping("/georisk")
  public GeoRiskResult geoRisk() {
    return geoRiskService.fetchGeoRisk();
  }
}
