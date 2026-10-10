package com.example;

import java.math.BigDecimal;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.json.Json;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;

@Singleton
public class OrderSummary {
    private final PriceList priceList;

    @Inject
    public OrderSummary(PriceList priceList) {
        this.priceList = priceList;
    }

    public JsonObject summarise(Map<String, Integer> quantities) {
        JsonArrayBuilder lines = Json.createArrayBuilder();
        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<String, Integer> entry : quantities.entrySet()) {
            BigDecimal price = priceList.prices().get(entry.getKey());
            BigDecimal amount = price.multiply(BigDecimal.valueOf(entry.getValue()));
            total = total.add(amount);
            lines.add(Json.createObjectBuilder().add("sku", entry.getKey()).add("amount", amount));
        }
        return Json.createObjectBuilder().add("lines", lines).add("total", total).build();
    }
}
