package com.example;

public class BillingService {
    private final PaymentGateway gateway;

    public BillingService(PaymentGateway gateway) {
        this.gateway = gateway;
    }

    public String bill(String customer, long cents) {
        if (cents <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }
        return gateway.charge(customer, cents);
    }
}
