package com.example;

public class Calculator {
    public int divide(int a, int b) {
        if (b == 0) {
            throw new IllegalArgumentException("division by zero");
        }
        return a / b;
    }
}
