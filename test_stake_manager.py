"""
Validation tests for StakeManager.
Hand-calculated expected values for every test.
Run: python test_stake_manager.py
"""

from stake_manager import StakeManager, SizingMethod, Direction


def test_fixed_fractional_long():
    """
    $10K equity, 2% risk, LONG entry $50000, SL $48500
    risk_per_unit = 50000 - 48500 = $1500
    risk_amount = 10000 * 0.02 = $200
    size = 200 / 1500 = 0.13333 BTC
    usd_value = 0.13333 * 50000 = $6666.67
    """
    sm = StakeManager(initial_capital=10_000, risk_pct=0.02, max_position_pct=1.0)
    result = sm.calculate_position_size(50_000, 48_500, Direction.LONG)

    assert abs(result["risk_amount"] - 200.0) < 0.01, f"risk_amount: {result['risk_amount']}"
    assert abs(result["size"] - 0.13333) < 0.001, f"size: {result['size']}"
    assert abs(result["usd_value"] - 6666.67) < 1.0, f"usd_value: {result['usd_value']}"
    assert result["method_used"] == "fixed_fractional"
    print("PASS: test_fixed_fractional_long")


def test_fixed_fractional_short():
    """
    $10K equity, 2% risk, SHORT entry $50000, SL $51500
    risk_per_unit = 51500 - 50000 = $1500
    risk_amount = $200
    size = 200 / 1500 = 0.13333 BTC
    """
    sm = StakeManager(initial_capital=10_000, risk_pct=0.02, max_position_pct=1.0)
    result = sm.calculate_position_size(50_000, 51_500, Direction.SHORT)

    assert abs(result["risk_amount"] - 200.0) < 0.01
    assert abs(result["size"] - 0.13333) < 0.001
    assert result["method_used"] == "fixed_fractional"
    print("PASS: test_fixed_fractional_short")


def test_max_position_cap():
    """
    $10K equity, 2% risk, LONG entry $100, SL $99
    risk_per_unit = $1, risk_amount = $200, size = 200 BTC
    usd_value = 200 * 100 = $20,000 → exceeds 50% cap ($5000)
    Capped: size = 5000 / 100 = 50, usd = $5000
    risk_amount recalc = 50 * 1 = $50
    """
    sm = StakeManager(initial_capital=10_000, risk_pct=0.02, max_position_pct=0.50)
    result = sm.calculate_position_size(100, 99, Direction.LONG)

    assert abs(result["usd_value"] - 5000.0) < 0.01, f"usd_value: {result['usd_value']}"
    assert abs(result["size"] - 50.0) < 0.01, f"size: {result['size']}"
    assert abs(result["risk_amount"] - 50.0) < 0.01, f"risk_amount: {result['risk_amount']}"
    print("PASS: test_max_position_cap")


def test_stop_equals_entry():
    """SL = entry → risk_per_unit = 0 → should return zero size."""
    sm = StakeManager()
    result = sm.calculate_position_size(50_000, 50_000, Direction.LONG)

    assert result["size"] == 0.0
    assert result["method_used"] == "invalid_stop"
    print("PASS: test_stop_equals_entry")


def test_wrong_stop_direction():
    """LONG with SL above entry → negative risk_per_unit → should return zero."""
    sm = StakeManager()
    result = sm.calculate_position_size(50_000, 52_000, Direction.LONG)

    assert result["size"] == 0.0
    assert result["method_used"] == "invalid_stop"
    print("PASS: test_wrong_stop_direction")


def test_equity_tracking():
    """
    Open LONG at $50000, SL $48500, size 0.1 BTC
    Close at $53000 → PnL = (53000 - 50000) * 0.1 = $300
    Equity = 10000 + 300 = $10300
    """
    sm = StakeManager(initial_capital=10_000)
    pos_id = sm.open_position(50_000, 48_500, 0.1, Direction.LONG)
    record = sm.close_position(pos_id, 53_000)

    assert abs(record.pnl - 300.0) < 0.01, f"pnl: {record.pnl}"
    assert abs(sm.get_equity() - 10_300.0) < 0.01, f"equity: {sm.get_equity()}"
    print("PASS: test_equity_tracking")


def test_short_pnl():
    """
    Open SHORT at $50000, SL $51500, size 0.2 BTC
    Close at $47000 → PnL = (50000 - 47000) * 0.2 = $600
    """
    sm = StakeManager(initial_capital=10_000)
    pos_id = sm.open_position(50_000, 51_500, 0.2, Direction.SHORT)
    record = sm.close_position(pos_id, 47_000)

    assert abs(record.pnl - 600.0) < 0.01, f"pnl: {record.pnl}"
    assert abs(sm.get_equity() - 10_600.0) < 0.01
    print("PASS: test_short_pnl")


def test_short_loss():
    """
    Open SHORT at $50000, SL $51500, size 0.2 BTC
    Close at $52000 → PnL = (50000 - 52000) * 0.2 = -$400
    """
    sm = StakeManager(initial_capital=10_000)
    pos_id = sm.open_position(50_000, 51_500, 0.2, Direction.SHORT)
    record = sm.close_position(pos_id, 52_000)

    assert abs(record.pnl - (-400.0)) < 0.01, f"pnl: {record.pnl}"
    assert abs(sm.get_equity() - 9_600.0) < 0.01
    print("PASS: test_short_loss")


def test_sequence_of_trades():
    """
    Trade 1: LONG $50000→$52000, 0.1 BTC → +$200, equity $10200
    Trade 2: SHORT $52000→$50000, 0.1 BTC → +$200, equity $10400
    Trade 3: LONG $50000→$48000, 0.1 BTC → -$200, equity $10200

    Next position size should use $10200 equity:
    risk = 10200 * 0.02 = $204
    """
    sm = StakeManager(initial_capital=10_000, risk_pct=0.02, max_position_pct=1.0)

    pid1 = sm.open_position(50_000, 48_000, 0.1, Direction.LONG)
    sm.close_position(pid1, 52_000)
    assert abs(sm.get_equity() - 10_200.0) < 0.01

    pid2 = sm.open_position(52_000, 54_000, 0.1, Direction.SHORT)
    sm.close_position(pid2, 50_000)
    assert abs(sm.get_equity() - 10_400.0) < 0.01

    pid3 = sm.open_position(50_000, 48_000, 0.1, Direction.LONG)
    sm.close_position(pid3, 48_000)
    assert abs(sm.get_equity() - 10_200.0) < 0.01

    result = sm.calculate_position_size(50_000, 48_500, Direction.LONG)
    expected_risk = 10_200 * 0.02  # $204
    assert abs(result["risk_amount"] - expected_risk) < 0.01, f"risk: {result['risk_amount']}"
    print("PASS: test_sequence_of_trades")


def test_kelly_fallback():
    """Kelly with < 20 trades should fall back to fixed fractional."""
    sm = StakeManager(initial_capital=10_000, risk_pct=0.02, method=SizingMethod.KELLY)

    # Add 5 trades (below kelly_min_trades=20)
    for i in range(5):
        pid = sm.open_position(50_000, 48_000, 0.1, Direction.LONG)
        sm.close_position(pid, 52_000)

    result = sm.calculate_position_size(50_000, 48_500, Direction.LONG)
    assert result["method_used"] == "kelly_fallback_to_fixed"
    print("PASS: test_kelly_fallback")


def test_kelly_calculation():
    """
    Simulate 30 trades: 20 wins of +$300, 10 losses of -$150
    win_rate = 20/30 = 0.6667
    avg_win = $300, avg_loss = $150
    payoff_ratio = 300/150 = 2.0
    kelly = 0.6667 - (1-0.6667)/2.0 = 0.6667 - 0.1667 = 0.5000

    Half-kelly risk = equity * 0.50 * 0.50 = equity * 0.25

    Use entry $100, SL $50 so risk_per_unit=$50, keeping notional well under cap.
    """
    sm = StakeManager(
        initial_capital=100_000,
        risk_pct=0.02,
        method=SizingMethod.KELLY,
        kelly_min_trades=20,
        kelly_fraction=0.5,
        max_position_pct=1.0,
    )

    # Build trade history with exact win/loss amounts
    for i in range(20):
        pid = sm.open_position(50_000, 47_000, 0.1, Direction.LONG)
        sm.close_position(pid, 53_000)  # +$300

    for i in range(10):
        pid = sm.open_position(50_000, 47_000, 0.1, Direction.LONG)
        sm.close_position(pid, 48_500)  # -$150

    stats = sm.get_stats()
    assert abs(stats["kelly_raw"] - 0.50) < 0.01, f"kelly_raw: {stats['kelly_raw']}"

    # Use cheap asset with wide stop so notional stays within cap
    result = sm.calculate_position_size(100, 50, Direction.LONG)
    assert result["method_used"] == "kelly"

    # Half-kelly: equity * 0.50 * 0.50 = equity * 0.25
    equity = sm.get_equity()
    expected_risk = equity * 0.50 * 0.50
    assert abs(result["risk_amount"] - expected_risk) < 1.0, \
        f"risk: {result['risk_amount']}, expected: {expected_risk}"

    # Verify size: risk / risk_per_unit = expected_risk / 50
    expected_size = expected_risk / 50
    assert abs(result["size"] - expected_size) < 0.1, \
        f"size: {result['size']}, expected: {expected_size}"
    print("PASS: test_kelly_calculation")


def test_kelly_negative_edge():
    """
    If win_rate is too low, kelly goes negative → should return zero size.
    10 wins of +$100, 20 losses of -$200
    win_rate = 10/30 = 0.3333
    payoff_ratio = 100/200 = 0.5
    kelly = 0.3333 - 0.6667/0.5 = 0.3333 - 1.3333 = -1.0
    """
    sm = StakeManager(
        initial_capital=100_000,
        method=SizingMethod.KELLY,
        kelly_min_trades=20,
    )

    for i in range(10):
        pid = sm.open_position(50_000, 48_000, 0.05, Direction.LONG)
        sm.close_position(pid, 52_000)  # +$100

    for i in range(20):
        pid = sm.open_position(50_000, 48_000, 0.1, Direction.LONG)
        sm.close_position(pid, 48_000)  # -$200

    result = sm.calculate_position_size(50_000, 48_500, Direction.LONG)
    assert result["size"] == 0.0
    assert result["method_used"] == "kelly_negative"
    print("PASS: test_kelly_negative_edge")


def test_zero_equity_protection():
    """If equity hits zero or negative, position size should be zero."""
    sm = StakeManager(initial_capital=1_000)

    # Lose everything
    pid = sm.open_position(50_000, 40_000, 0.1, Direction.LONG)
    sm.close_position(pid, 40_000)  # -$1000, equity = 0

    assert sm.get_equity() == 0.0
    result = sm.calculate_position_size(50_000, 48_500, Direction.LONG)
    assert result["size"] == 0.0
    print("PASS: test_zero_equity_protection")


def test_close_nonexistent_position():
    """Closing a position that doesn't exist returns None."""
    sm = StakeManager()
    result = sm.close_position("fake_id", 50_000)
    assert result is None
    print("PASS: test_close_nonexistent_position")


def test_stats_empty():
    """Stats with no trades should return zeroes."""
    sm = StakeManager(initial_capital=10_000)
    stats = sm.get_stats()

    assert stats["total_trades"] == 0
    assert stats["win_rate"] == 0.0
    assert stats["equity"] == 10_000
    print("PASS: test_stats_empty")


def test_profit_factor():
    """
    2 wins of +$500 each, 1 loss of -$200
    PF = 1000 / 200 = 5.0
    """
    sm = StakeManager(initial_capital=100_000)

    for _ in range(2):
        pid = sm.open_position(50_000, 45_000, 0.1, Direction.LONG)
        sm.close_position(pid, 55_000)  # +$500

    pid = sm.open_position(50_000, 45_000, 0.1, Direction.LONG)
    sm.close_position(pid, 48_000)  # -$200

    stats = sm.get_stats()
    assert abs(stats["profit_factor"] - 5.0) < 0.01, f"PF: {stats['profit_factor']}"
    assert stats["win_rate"] == 2/3
    print("PASS: test_profit_factor")


def test_reset():
    """Reset should return to initial state."""
    sm = StakeManager(initial_capital=10_000)
    pid = sm.open_position(50_000, 48_000, 0.1, Direction.LONG)
    sm.close_position(pid, 52_000)

    sm.reset()
    assert sm.get_equity() == 10_000
    assert len(sm.trade_history) == 0
    assert len(sm.open_positions) == 0
    print("PASS: test_reset")


if __name__ == "__main__":
    tests = [
        test_fixed_fractional_long,
        test_fixed_fractional_short,
        test_max_position_cap,
        test_stop_equals_entry,
        test_wrong_stop_direction,
        test_equity_tracking,
        test_short_pnl,
        test_short_loss,
        test_sequence_of_trades,
        test_kelly_fallback,
        test_kelly_calculation,
        test_kelly_negative_edge,
        test_zero_equity_protection,
        test_close_nonexistent_position,
        test_stats_empty,
        test_profit_factor,
        test_reset,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"FAIL: {test.__name__} — {e}")
            failed += 1
        except Exception as e:
            print(f"ERROR: {test.__name__} — {e}")
            failed += 1

    print(f"\n{'='*40}")
    print(f"Results: {passed}/{passed+failed} passed")
    if failed == 0:
        print("ALL TESTS PASSED")
    else:
        print(f"{failed} FAILED")
