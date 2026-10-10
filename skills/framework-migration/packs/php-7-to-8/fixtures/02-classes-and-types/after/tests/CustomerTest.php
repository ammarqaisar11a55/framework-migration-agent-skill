<?php

namespace Example\Customers\Tests;

use Example\Customers\Address;
use Example\Customers\Customer;
use PHPUnit\Framework\TestCase;

final class CustomerTest extends TestCase
{
    public function testCityIsOptional(): void
    {
        $this->assertSame('Leeds', (new Customer('Ada', new Address('Leeds')))->city());
        $this->assertNull((new Customer('Bo'))->city());
    }

    public function testStringAndLabel(): void
    {
        $this->assertSame('Ada', (string) new Customer('Ada'));
        $this->assertSame('customer-7', Customer::label(7));
        $this->assertSame('customer-x7', Customer::label('x7'));
    }

    public function testTiers(): void
    {
        $this->assertSame(['new', 'returning', 'loyal'], array_map([Customer::class, 'tier'], [0, 1, 5]));
    }

    public function testParseOrders(): void
    {
        $this->assertSame(3, Customer::parseOrders('3'));
        $this->assertSame(0, Customer::parseOrders('not json'));
    }
}
