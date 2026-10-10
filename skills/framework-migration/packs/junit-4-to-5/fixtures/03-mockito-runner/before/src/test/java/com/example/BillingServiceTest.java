package com.example;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

@RunWith(MockitoJUnitRunner.class)
public class BillingServiceTest {
    @Mock
    private PaymentGateway gateway;

    private BillingService service;

    @Before
    public void setUp() {
        service = new BillingService(gateway);
    }

    @Test
    public void chargesThroughTheGateway() {
        when(gateway.charge("ada", 500)).thenReturn("receipt-1");
        assertEquals("receipt-1", service.bill("ada", 500));
        verify(gateway).charge("ada", 500);
    }

    @Test(expected = IllegalArgumentException.class)
    public void refusesNonPositiveAmounts() {
        try {
            service.bill("ada", 0);
        } finally {
            verify(gateway, never()).charge(anyString(), anyLong());
        }
    }
}
