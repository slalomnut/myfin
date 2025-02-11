<?php

/*
 * TYPES:
 * - Buy (B)
 * - Sell (S)
 */

class InvestTransactionModel extends Entity
{
    protected static $table = "invest_transactions";

    protected static $columns = [
        "transaction_id",
        "date_timestamp",
        "type",
        "note",
        "total_price",
        "units",
        "invest_assets_asset_id",
        "created_at",
        "updated_at"
    ];

    public static function getAllTransactionsForUser($userID, $transactional = false)
    {
        $db = new EnsoDB($transactional);
        $sql = "SELECT transaction_id, date_timestamp, invest_transactions.type as 'trx_type', invest_assets.type as 'asset_type', note, (total_price/100) as 'total_price', invest_transactions.units, invest_assets_asset_id, name, ticker, broker, invest_assets.asset_id " .
            "FROM invest_transactions INNER JOIN invest_assets ON invest_assets.asset_id = invest_assets_asset_id " .
            "WHERE users_user_id = :userID ORDER BY date_timestamp DESC;";

        $values = array();
        $values[":userID"] = $userID;

        try {
            $db->prepare($sql);
            $db->execute($values);
            return $db->fetchAll();
        } catch (Exception $e) {
            return $e;
        }
    }

    public static function deleteTransactionForUser($trxId, $userId, $transactional)
    {
        $db = new EnsoDB($transactional);
        $sql = "DELETE " . static::$table . " from " . static::$table . " " .
            "INNER JOIN invest_assets ON invest_assets_asset_id = invest_assets.asset_id " .
            "WHERE users_user_id = :userId AND transaction_id = :trxId ";

        $values = array();
        $values[":userId"] = $userId;
        $values[":trxId"] = $trxId;

        try {
            $db->prepare($sql);
            $db->execute($values);
            return $db->fetchAll();
        } catch (Exception $e) {
            return $e;
        }
    }

    public static function getCombinedInvestedBalanceBetweenDatesForUser($userId, $beginTimestamp, $endTimestamp, $transactional = false)
    {

        $db = new EnsoDB($transactional);

        $sql = "SELECT (SUM(CASE WHEN invest_transactions.type = 'S' THEN total_price * -1 ELSE total_price END)/100) as 'invested_balance' " .
            "FROM invest_transactions " .
            "INNER JOIN invest_assets ON invest_assets_asset_id = asset_id " .
            "WHERE users_user_id = :userId AND date_timestamp BETWEEN :date1 and :date2";

        $values = array();
        $values[':userId'] = $userId;
        $values[':date1'] = $beginTimestamp;
        $values[':date2'] = $endTimestamp;

        try {
            $db->prepare($sql);
            $db->execute($values);

            $result = $db->fetchAll();

            if (!$result) return 0;
            return floatval($result[0]["invested_balance"]);
        } catch (Exception $e) {
            return $e;
        }
    }

    public static function getCombinedInvestedAndWithdrawnBalancesBetweenDatesForUser($userId, $beginTimestamp, $endTimestamp, $transactional = false)
    {

        $db = new EnsoDB($transactional);

        $sql = "SELECT (SUM(CASE WHEN invest_transactions.type = 'B' THEN 0 ELSE total_price END)/100) as 'withdrawn_amount', " .
            "(SUM(CASE WHEN invest_transactions.type = 'S' THEN 0 ELSE total_price END)/100) as 'invested_amount' " .
            "FROM invest_transactions " .
            "INNER JOIN invest_assets ON invest_assets_asset_id = asset_id " .
            "WHERE users_user_id = :userId AND date_timestamp BETWEEN :date1 and :date2";

        $values = array();
        $values[':userId'] = $userId;
        $values[':date1'] = $beginTimestamp;
        $values[':date2'] = $endTimestamp;

        try {
            $db->prepare($sql);
            $db->execute($values);

            $result = $db->fetchAll();

            if (!$result) return 0;
            return $result[0];
        } catch (Exception $e) {
            return $e;
        }
    }
}