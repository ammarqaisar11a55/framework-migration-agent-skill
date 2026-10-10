<?php

namespace Example\Text;

final class Strings
{
    public static function mentions(string $text, string $name): bool
    {
        return str_contains(strtolower($text), strtolower($name));
    }

    public static function isCommand(string $line): bool
    {
        return str_starts_with($line, '/');
    }

    public static function isQuestion(string $line): bool
    {
        return str_ends_with($line, '?');
    }

    public static function kind(string $line): string
    {
        $kind = match (true) {
            self::isCommand($line) => 'command',
            self::isQuestion($line) => 'question',
            default => 'statement',
        };

        return $kind;
    }

    public static function describe($value): string
    {
        if (is_object($value)) {
            return $value::class;
        }

        return gettype($value);
    }
}
