<?php

namespace Example\Report\Tests;

use Example\Report\Totals;
use PHPUnit\Framework\TestCase;

final class TotalsTest extends TestCase
{
    public function testTotalsPerCategory(): void
    {
        $rows = [['tea', 3], ['cake', 2], ['tea', 4]];
        $this->assertSame(['cake' => 2, 'tea' => 7], Totals::byCategory($rows));
    }

    public function testScaled(): void
    {
        $this->assertSame([1.1, 2.2], Totals::scaled([1, 2], 1.1));
    }

    public function testDefaults(): void
    {
        $this->assertSame(['currency' => 'EUR', 'precision' => 2], Totals::withDefaults([]));
        $this->assertSame(['currency' => 'GBP', 'precision' => 0], Totals::withDefaults(['currency' => 'GBP', 'precision' => 0]));
    }
}
