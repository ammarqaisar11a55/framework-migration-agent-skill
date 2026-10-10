package com.example;

public interface PaymentGateway {
    String charge(String customer, long cents);
}
