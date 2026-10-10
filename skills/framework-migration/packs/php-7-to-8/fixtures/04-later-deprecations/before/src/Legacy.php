<?php

namespace Example\Legacy;

final class Legacy
{
    public static function toLatin1(string $text): string
    {
        return utf8_decode($text);
    }

    public static function greeting(string $name): string
    {
        return "Hello ${name}";
    }

    public static function isEmptyCount($count): bool
    {
        return $count == 0;
    }

    public static function plainText(string $html): string
    {
        return (string) filter_var($html, FILTER_SANITIZE_STRING);
    }
}
