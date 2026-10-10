<?php

namespace Example\Customers;

final class Address
{
    public function __construct(private string $city)
    {
    }

    public function city(): string
    {
        return $this->city;
    }
}
