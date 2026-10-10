<?php

namespace Example\Legacy\Tests;

use Example\Legacy\Legacy;
use PHPUnit\Framework\TestCase;

final class LegacyTest extends TestCase
{
    public function testToLatin1(): void
    {
        $this->assertSame("caf\xE9", Legacy::toLatin1('café'));
    }

    public function testGreeting(): void
    {
        $this->assertSame('Hello Ada', Legacy::greeting('Ada'));
    }

    public function testIsEmptyCount(): void
    {
        $this->assertTrue(Legacy::isEmptyCount(0));
        $this->assertTrue(Legacy::isEmptyCount('0'));
        $this->assertFalse(Legacy::isEmptyCount(3));
    }

    public function testPlainText(): void
    {
        $this->assertSame('bold', Legacy::plainText('<b>bold</b>'));
    }
}
