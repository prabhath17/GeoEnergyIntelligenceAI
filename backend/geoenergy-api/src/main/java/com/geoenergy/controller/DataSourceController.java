package com.geoenergy.controller;

import com.geoenergy.dto.GeoRiskResult;
import com.geoenergy.dto.NewsResult;
import com.geoenergy.dto.PriceResult;
import com.geoenergy.service.DashboardService;
import com.geoenergy.service.GeoRiskService;
import com.geoenergy.service.NewsService;
import com.geoenergy.service.PriceService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/data-sources")
public class DataSourceController {
  private final DashboardService dashboardService;
  private final PriceService priceService;
  private final NewsService newsService;
  private final GeoRiskService geoRiskService;

  public DataSourceController(DashboardService dashboardService, PriceService priceService, NewsService newsService, GeoRiskService geoRiskService) {
    this.dashboardService = dashboardService;
    this.priceService = priceService;
    this.newsService = newsService;
    this.geoRiskService = geoRiskService;
  }

  @GetMapping("/status")
  public Map<String, Object> status() {
    PriceResult prices = priceService.fetchPrices();
    NewsResult news = newsService.fetchNews();
    GeoRiskResult geoRisk = geoRiskService.fetchGeoRisk();
    return dashboardService.dataSourceStatus(prices, news, geoRisk);
  }
}
