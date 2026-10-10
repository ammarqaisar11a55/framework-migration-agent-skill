<?php

namespace Example\Customers;

final class Customer implements \Stringable
{
    public function __construct(private string $name, private ?Address $address = null)
    {
    }

    public function city(): ?string
    {
        return $this->address !== null ? $this->address->city() : null;
    }

    public function __toString(): string
    {
        return $this->name;
    }

    /**
     * @param int|string $id
     */
    public static function label($id): string
    {
        return 'customer-' . $id;
    }

    public static function tier(int $orders): string
    {
        return match ($orders) {
            0 => 'new',
            1 => 'returning',
            default => 'loyal',
        };
    }

    public static function parseOrders(string $raw): int
    {
        try {
            return (int) json_decode($raw, false, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return 0;
        }
    }
}
