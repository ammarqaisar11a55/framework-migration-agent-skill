<?php

namespace Example\Report;

final class Totals
{
    public static function byCategory(array $rows): array
    {
        $totals = array();
        foreach ($rows as $row) {
            list($category, $amount) = $row;
            $totals[$category] = (isset($totals[$category]) ? $totals[$category] : 0) + $amount;
        }
        ksort($totals);

        return $totals;
    }

    public static function scaled(array $amounts, float $factor): array
    {
        return array_map(function ($amount) use ($factor) {
            return round($amount * $factor, 2);
        }, $amounts);
    }

    public static function withDefaults(array $options): array
    {
        $options['currency'] = isset($options['currency']) ? $options['currency'] : 'EUR';
        $options['precision'] = $options['precision'] ?? 2;

        return $options;
    }
}
