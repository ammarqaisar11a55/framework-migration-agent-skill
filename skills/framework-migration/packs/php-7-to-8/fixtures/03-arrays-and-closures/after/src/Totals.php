<?php

namespace Example\Report;

final class Totals
{
    public static function byCategory(array $rows): array
    {
        $totals = [];
        foreach ($rows as $row) {
            [$category, $amount] = $row;
            $totals[$category] = ($totals[$category] ?? 0) + $amount;
        }
        ksort($totals);

        return $totals;
    }

    public static function scaled(array $amounts, float $factor): array
    {
        return array_map(fn($amount) => round($amount * $factor, 2), $amounts);
    }

    public static function withDefaults(array $options): array
    {
        $options['currency'] ??= 'EUR';
        $options['precision'] ??= 2;

        return $options;
    }
}
