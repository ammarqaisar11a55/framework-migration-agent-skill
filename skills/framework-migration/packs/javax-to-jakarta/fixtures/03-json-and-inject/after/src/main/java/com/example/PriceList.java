package com.example;

import java.math.BigDecimal;
import java.util.Map;

public interface PriceList {
    Map<String, BigDecimal> prices();
}
