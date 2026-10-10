<?php

namespace Example\Text;

final class Strings
{
    public static function mentions(string $text, string $name): bool
    {
        return strpos(strtolower($text), strtolower($name)) !== false;
    }

    public static function isCommand(string $line): bool
    {
        return substr($line, 0, 1) === '/';
    }

    public static function isQuestion(string $line): bool
    {
        return substr($line, -1) === '?';
    }

    public static function kind(string $line): string
    {
        switch (true) {
            case self::isCommand($line):
                $kind = 'command';
                break;
            case self::isQuestion($line):
                $kind = 'question';
                break;
            default:
                $kind = 'statement';
        }

        return $kind;
    }

    public static function describe($value): string
    {
        if (is_object($value)) {
            return get_class($value);
        }

        return gettype($value);
    }
}
