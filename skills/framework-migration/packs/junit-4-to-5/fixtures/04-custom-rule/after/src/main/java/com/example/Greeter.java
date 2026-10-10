package com.example;

import java.util.Locale;

public class Greeter {
    public String greet(String name) {
        return Locale.getDefault().getLanguage().equals("fr") ? "Bonjour " + name : "Hello " + name;
    }
}
