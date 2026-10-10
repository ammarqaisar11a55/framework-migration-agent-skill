<?php

namespace Example\Customers;

final class Customer
{
    /** @var string */
    private $name;

    /** @var Address|null */
    private $address;

    public function __construct(string $name, ?Address $address = null)
    {
        $this->name = $name;
        $this->address = $address;
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
        switch ($orders) {
            case 0:
                return 'new';
            case 1:
                return 'returning';
            default:
                return 'loyal';
        }
    }

    public static function parseOrders(string $raw): int
    {
        try {
            return (int) json_decode($raw, false, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            return 0;
        }
    }
}
