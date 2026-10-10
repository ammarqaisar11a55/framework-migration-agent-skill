package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import com.google.inject.AbstractModule;
import com.google.inject.Guice;
import com.google.inject.Injector;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OrderSummaryTest {
    private final Injector injector = Guice.createInjector(new AbstractModule() {
        @Override
        protected void configure() {
            bind(PriceList.class).toInstance(() -> Map.of("tea", new BigDecimal("3.50"), "cake", new BigDecimal("2.25")));
        }
    });

    @Test
    void summarisesLinesAsJson() {
        Map<String, Integer> quantities = new LinkedHashMap<>();
        quantities.put("tea", 2);
        quantities.put("cake", 1);
        assertEquals(
            "{\"lines\":[{\"sku\":\"tea\",\"amount\":7.00},{\"sku\":\"cake\",\"amount\":2.25}],\"total\":9.25}",
            injector.getInstance(OrderSummary.class).summarise(quantities).toString());
    }

    @Test
    void isASingleton() {
        assertSame(injector.getInstance(OrderSummary.class), injector.getInstance(OrderSummary.class));
    }
}
