<?php

namespace Example\Text\Tests;

use Example\Text\Strings;
use PHPUnit\Framework\TestCase;

final class StringsTest extends TestCase
{
    public function testMentionsIgnoresCase(): void
    {
        $this->assertTrue(Strings::mentions('Hello ADA, welcome', 'ada'));
        $this->assertFalse(Strings::mentions('Hello Bob', 'ada'));
    }

    public function testKinds(): void
    {
        $this->assertSame('command', Strings::kind('/help'));
        $this->assertSame('question', Strings::kind('Are you there?'));
        $this->assertSame('statement', Strings::kind('Fine.'));
        $this->assertSame('command', Strings::kind('/why?'));
    }

    public function testDescribe(): void
    {
        $this->assertSame(Strings::class, Strings::describe(new Strings()));
        $this->assertSame('integer', Strings::describe(42));
    }
}
