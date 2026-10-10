package com.example;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@MockitoSettings(strictness = Strictness.WARN)
@ExtendWith(MockitoExtension.class)
public class BillingServiceTest {
    @Mock
    private PaymentGateway gateway;

    private BillingService service;

    @BeforeEach
    public void setUp() {
        service = new BillingService(gateway);
    }

    @Test
    public void chargesThroughTheGateway() {
        when(gateway.charge("ada", 500)).thenReturn("receipt-1");
        assertEquals("receipt-1", service.bill("ada", 500));
        verify(gateway).charge("ada", 500);
    }

    @Test
    public void refusesNonPositiveAmounts() {
        assertThrows(IllegalArgumentException.class, () -> {
            try {
                service.bill("ada", 0);
            } finally {
                verify(gateway, never()).charge(anyString(), anyLong());
            }
        });
    }
}
