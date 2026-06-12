package com.geoenergy.controller;

import com.geoenergy.dto.DashboardResponse;
import com.geoenergy.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
  private final DashboardService dashboardService;

  public DashboardController(DashboardService dashboardService) {
    this.dashboardService = dashboardService;
  }

  @GetMapping("/live")
  public DashboardResponse live() {
    return dashboardService.liveDashboard();
  }
}
