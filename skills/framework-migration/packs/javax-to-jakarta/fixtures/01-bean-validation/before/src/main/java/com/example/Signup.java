package com.example;

import javax.validation.constraints.Email;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class Signup {
    @NotBlank
    @Size(max = 20)
    private final String username;

    @Email
    private final String email;

    @Min(13)
    private final int age;

    public Signup(String username, String email, int age) {
        this.username = username;
        this.email = email;
        this.age = age;
    }
}
