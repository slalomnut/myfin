<?php

class InvestAssetEvoSnapshotModel extends Entity
{
    protected static $table = "invest_asset_evo_snapshot";

    protected static $columns = [
        "month",
        "year",
        "units",
        "invested_amount",
        "current_value",
        "invest_assets_asset_id",
        "created_at",
        "updated_at"
    ];

    public static function updateCurrentAssetValue($month, $year, $assetID, $units, $withdrawnAmount, $newValue, $transactional = false)
    {
        $db = new EnsoDB($transactional);

        $sql = "INSERT INTO invest_asset_evo_snapshot (month, year, units, invested_amount, current_value, invest_assets_asset_id, created_at, updated_at, withdrawn_amount) " .
            " VALUES(:month, :year, :units, :investedAmount, :currentValue, :assetID, :createdAt, :updatedAt, :withdrawnAmount) " .
            " ON DUPLICATE KEY UPDATE current_value = :currentValue, updated_at = :updatedAt";

        $latestSnapshot = InvestAssetEvoSnapshotModel::getLatestSnapshotForAsset($assetID, $month, $year, $transactional);
        if ($latestSnapshot) $latestSnapshot = $latestSnapshot[0];

        $values = array();
        $values[':month'] = $month;
        $values[':year'] = $year;
        $values[':units'] = $units;
        $values[':investedAmount'] = $latestSnapshot ? $latestSnapshot["invested_amount"] : 0;
        $values[':currentValue'] = Input::convertFloatToIntegerAmount($newValue);
        $values[':withdrawnAmount'] = Input::convertFloatToIntegerAmount($withdrawnAmount);
        $values[':assetID'] = $assetID;
        $values[':createdAt'] = EnsoShared::now();
        $values[':updatedAt'] = EnsoShared::now();

        try {
            $db->prepare($sql);
            $db->execute($values);
            return $db->fetchAll();
        } catch (Exception $e) {
            return $e;
        }
    }

    public static function getAssetSnapshotAtMonth($month, $year, $assetID, $transactional = false)
    {
        if (InvestAssetEvoSnapshotModel::exists(["invest_assets_asset_id" => $assetID, "month" => $month, "year" => $year])) {
            $snapshot = InvestAssetEvoSnapshotModel::getWhere(["invest_assets_asset_id" => $assetID, "month" => $month, "year" => $year])[0];
        } else {
            $snapshot = null;
        }

        return $snapshot;
    }

    public static function addCustomBalanceSnapshot($assetId, $month, $year, $units, $investedAmount, $currentAmount, $withdrawnAmount, $transactional = false)
    {

        $db = new EnsoDB($transactional);

        $sql = "INSERT INTO invest_asset_evo_snapshot (month, year, units, invested_amount, current_value, invest_assets_asset_id, created_at, updated_at, withdrawn_amount) " .
            "VALUES (:month, :year, :units, :invested_amount, :current_amount, :invest_assets_asset_id, :created_at, :updated_at, :withdrawn_amount) " .
            "ON DUPLICATE KEY UPDATE units = :units, invested_amount = :invested_amount, /*current_value = :current_amount,*/ updated_at = :updated_at, withdrawn_amount = :withdrawn_amount;";

        $values = array();
        $values[':month'] = $month;
        $values[':year'] = $year;
        $values[':units'] = $units;
        $values[':invested_amount'] = $investedAmount;
        $values[':current_amount'] = $currentAmount;
        $values[':invest_assets_asset_id'] = $assetId;
        $values[':withdrawn_amount'] = $withdrawnAmount;
        $values[':created_at'] = time();
        $values[':updated_at'] = time();

        try {
            $db->prepare($sql);
            $db->execute($values);
            return $db->fetchAll();
        } catch (Exception $e) {
            return $e;
        }
    }

    /**
     * @throws InexistentAttributeProvidedException
     */
    public static function updateSnapshot($unixDate, float $newUnits, float $lastAmount, int $assetID, $transactional = false)
    {
        // TODO: recalculate all snapshots if $unixDate is not from current month

        $month = date('m', $unixDate);
        $year = date('Y', $unixDate);

        $snapshot = InvestAssetEvoSnapshotModel::getLatestSnapshotForAsset($assetID, null, null, $transactional);

        if ($snapshot && $snapshot[0]["month"] == $month && $snapshot[0]["year"] == $year) {
            // Snapshot exists -> update it
            InvestAssetEvoSnapshotModel::editWhere(
                ["month" => $month, "year" => $year, "invest_assets_asset_id" => $assetID],
                [
                    "units" => $newUnits,
                    "invested_amount" => doubleval($snapshot["invested_amount"]) + $lastAmount,
                    "current_value" => doubleval($snapshot["current_value"]) + $lastAmount,
                    "updated_at" => EnsoShared::now(),
                ],
                $transactional
            );
        } else {
            // Snapshot for month doesn't exist -> create it
            InvestAssetEvoSnapshotModel::insert(
                [
                    "month" => $month,
                    "year" => $year,
                    "units" => $newUnits,
                    "invested_amount" => ($snapshot) ? doubleval($snapshot["invested_amount"]) + $lastAmount : $lastAmount,
                    "current_value" => ($snapshot) ? doubleval($snapshot["current_value"]) + $lastAmount : $lastAmount,
                    "invest_assets_asset_id" => $assetID,
                    "created_at" => EnsoShared::now(),
                    "updated_at" => EnsoShared::now(),
                ],
                $transactional
            );
        }
    }

    public static function getLatestSnapshotForAsset($assetId, $maxMonth, $maxYear, $transactional = false)
    {
        if (!$maxMonth) {
            $maxMonth = date('m', time());
        }
        if (!$maxYear) {
            $maxYear = date('Y', time());
        }

        $db = new EnsoDB($transactional);

        $sql = "SELECT * FROM invest_asset_evo_snapshot " .
            "WHERE invest_assets_asset_id = :assetId " .
            "AND (year < :maxYear OR (year = :maxYear AND month <= :maxMonth)) " .
            "ORDER BY YEAR DESC, MONTH DESC LIMIT 1";

        $values = array();
        $values[':assetId'] = $assetId;
        $values[':maxYear'] = $maxYear;
        $values[':maxMonth'] = $maxMonth;

        try {
            $db->prepare($sql);
            $db->execute($values);
            $snapshot = $db->fetchAll();

            /* $snapshot = InvestAssetEvoSnapshotModel::getWhere(["invest_assets_asset_id" => $assetId]);*/
            if (!$snapshot || count($snapshot) < 1) return null;
            return $snapshot;

        } catch (Exception $e) {
            throw $e;
        }
    }

    public static function recalculateSnapshotForAssetsIncrementally($assetId, $fromDate, $toDate, $transactional = false)
    {
        /*
         * Given that I'm unable to know the invested/current amounts of an asset at any specific time (only at the end of each month),
         * I will need to recalculate from the beginning of the month relative to $fromDate all the way to the end of
         * month associated with $toDate.
         *
         * Will update units, current_amount & invested_amount
        */

        $beginMonth = date('m', $fromDate);
        $beginYear = date('Y', $fromDate);

        /*$priorMonthsSnapshot = InvestAssetEvoSnapshotModel::getAssetSnapshotAtMonth(($beginMonth > 2) ? ($beginMonth - 2) : 1,
            ($beginMonth > 2) ? $beginYear : ($beginYear - 1), $assetId, $transactional);*/

        // Get snapshot from 2 months prior of begin date
        $priorMonthsSnapshot = InvestAssetEvoSnapshotModel::getLatestSnapshotForAsset($assetId, ($beginMonth > 2) ? ($beginMonth - 2) : 12 - 2 + (int)$beginMonth,
            ($beginMonth > 2) ? $beginYear : ($beginYear - 1), $transactional);


        if (!$priorMonthsSnapshot)
            $priorMonthsSnapshot = ["units" => 0, "current_value" => 0, "invested_amount" => 0, "withdrawn_amount" => 0];
        else
            $priorMonthsSnapshot = $priorMonthsSnapshot[0];

        InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, $beginMonth, $beginYear,
            $priorMonthsSnapshot["units"], $priorMonthsSnapshot["invested_amount"], $priorMonthsSnapshot["current_value"], $priorMonthsSnapshot["withdrawn_amount"], $transactional);

        // Reset snapshots for next 2 months (in case there are no transactions in these months and the balance doesn't get recalculated
        InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, ($beginMonth < 12) ? $beginMonth + 1 : 1, ($beginMonth < 12) ? $beginYear : $beginYear + 1,
            $priorMonthsSnapshot["units"], $priorMonthsSnapshot["invested_amount"], $priorMonthsSnapshot["current_value"], $priorMonthsSnapshot["withdrawn_amount"], $transactional);
        InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, ($beginMonth < 11) ? $beginMonth + 2 : 1, ($beginMonth < 11) ? $beginYear : $beginYear + 1,
            $priorMonthsSnapshot["units"], $priorMonthsSnapshot["invested_amount"], $priorMonthsSnapshot["current_value"], $priorMonthsSnapshot["withdrawn_amount"], $transactional);


        if ($beginMonth > 1) $beginMonth--;
        else {
            $beginMonth = 12;
            $beginYear--;
        }

        $endMonth = date('m', $toDate);
        $endYear = date('Y', $toDate);

        if ($endMonth < 12) $endMonth++;
        else {
            $endMonth = 1;
            $endYear++;
        }

        $fromDate = strtotime("1-$beginMonth-$beginYear");
        $toDate = strtotime("1-$endMonth-$endYear");

        $trxList = InvestAssetModel::getAllTransactionsForAssetBetweenDates($assetId, $fromDate, $toDate, $transactional);

        $initialSnapshot = $priorMonthsSnapshot;
        if (!$initialSnapshot) $priorMonthsSnapshot = ["units" => 0, "current_value" => 0, "invested_amount" => 0, "withdrawn_amount" => 0];
        /*echo "\n############################################\n";
        echo "\nInitial Snapshot:";
        echo "\n";
        print_r($initialSnapshot);
        echo "\n";
        echo "\n############################################\n";*/
        foreach ($trxList as $trx) {
            $trxDate = $trx["date_timestamp"];
            $month = date('m', $trxDate);
            $year = date('Y', $trxDate);

            $trxType = $trx["type"];
            $changeInAmounts = $trx["total_price"];
            $changeInUnits = $trx["units"];

            if ($trxType == DEFAULT_INVESTING_TRANSACTIONS_SELL) {
                /*$changeInAmounts *= -1;*/
                $changeInUnits *= -1;
                $initialSnapshot["withdrawn_amount"] = doubleval($initialSnapshot["withdrawn_amount"]) + doubleval($changeInAmounts);
            } else {
                $initialSnapshot["invested_amount"] = doubleval($initialSnapshot["invested_amount"]) + doubleval($changeInAmounts);
            }
            /*echo "\nNew Transaction from date=" . gmdate("Y-m-d", $trxDate);
            echo "\nAmount: $changeInAmounts (type: $trxType)";
            echo "\nTrx Units:" . $initialSnapshot["units"];*/
            $initialSnapshot["units"] = doubleval($initialSnapshot["units"]) + doubleval($changeInUnits);
            /*$initialSnapshot["current_value"] = doubleval($initialSnapshot["current_value"]) + doubleval($changeInAmounts);*/
            /*echo "\nTOTAL Units:" . $initialSnapshot["units"];
            echo "\n-------------------------------------------\n";*/

            /* Automatically add snapshots for current & next 6 months in order to create a buffer*/

            InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, $month, $year,
                $initialSnapshot["units"], $initialSnapshot["invested_amount"], $initialSnapshot["current_value"], $initialSnapshot["withdrawn_amount"], $transactional);
            /*echo "$month/$year\n";*/
            $nextMonth = ($month + 1 > 12) ? 1 : ($month + 1);
            $nextMonthsYear = ($nextMonth > 12) ? $year + 1 : $year;
            InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, $nextMonth, $nextMonthsYear,
                $initialSnapshot["units"], $initialSnapshot["invested_amount"], $initialSnapshot["current_value"], $initialSnapshot["withdrawn_amount"], $transactional);
            /*echo "$nextMonth/$nextMonthsYear\n";*/
            $nextMonth = ($nextMonth + 1 > 12) ? 1 : ($nextMonth + 1);
            $nextMonthsYear = ($nextMonth == 1) ? $nextMonthsYear + 1 : $nextMonthsYear;
            InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, $nextMonth, $nextMonthsYear,
                $initialSnapshot["units"], $initialSnapshot["invested_amount"], $initialSnapshot["current_value"], $initialSnapshot["withdrawn_amount"], $transactional);
            /*echo "$nextMonth/$nextMonthsYear\n";*/
            $nextMonth = ($nextMonth + 1 > 12) ? 1 : ($nextMonth + 1);
            $nextMonthsYear = ($nextMonth == 1) ? $nextMonthsYear + 1 : $nextMonthsYear;
            InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, $nextMonth, $nextMonthsYear,
                $initialSnapshot["units"], $initialSnapshot["invested_amount"], $initialSnapshot["current_value"], $initialSnapshot["withdrawn_amount"], $transactional);
            /*echo "$nextMonth/$nextMonthsYear\n";*/
            $nextMonth = ($nextMonth + 1 > 12) ? 1 : ($nextMonth + 1);
            $nextMonthsYear = ($nextMonth == 1) ? $nextMonthsYear + 1 : $nextMonthsYear;
            InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, $nextMonth, $nextMonthsYear,
                $initialSnapshot["units"], $initialSnapshot["invested_amount"], $initialSnapshot["current_value"], $initialSnapshot["withdrawn_amount"], $transactional);
            /*echo "$nextMonth/$nextMonthsYear\n";*/
            $nextMonth = ($nextMonth + 1 > 12) ? 1 : ($nextMonth + 1);
            $nextMonthsYear = ($nextMonth == 1) ? $nextMonthsYear + 1 : $nextMonthsYear;
            InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, $nextMonth, $nextMonthsYear,
                $initialSnapshot["units"], $initialSnapshot["invested_amount"], $initialSnapshot["current_value"], $initialSnapshot["withdrawn_amount"], $transactional);
            /*echo "$nextMonth/$nextMonthsYear\n";*/
            $nextMonth = ($nextMonth + 1 > 12) ? 1 : ($nextMonth + 1);
            $nextMonthsYear = ($nextMonth == 1) ? $nextMonthsYear + 1 : $nextMonthsYear;
            InvestAssetEvoSnapshotModel::addCustomBalanceSnapshot($assetId, $nextMonth, $nextMonthsYear,
                $initialSnapshot["units"], $initialSnapshot["invested_amount"], $initialSnapshot["current_value"], $initialSnapshot["withdrawn_amount"], $transactional);
            /*echo "$nextMonth/$nextMonthsYear";*/
            /*die();*/
        }
        /*die();*/

        return $initialSnapshot;
    }

    public static function getAllAssetSnapshotsForUser($userId, $transactional = false)
    {

        $db = new EnsoDB($transactional);

        $sql = "SELECT month, year, invest_asset_evo_snapshot.units, (invested_amount/100) as 'invested_amount', (current_value/100) as 'current_value', invest_assets_asset_id as 'asset_id', name as 'asset_name', ticker as 'asset_ticker', broker as 'asset_broker' " .
            "FROM invest_asset_evo_snapshot INNER JOIN invest_assets ON invest_assets.asset_id = invest_assets_asset_id " .
            "WHERE users_user_id = :userId AND (year < :currentYear OR (year = :currentYear AND month <= :currentMonth)) ORDER BY year ASC, month ASC;";

        $values = array();
        $values[':userId'] = $userId;
        $values[':currentMonth'] = date('m', time());
        $values[':currentYear'] = date('Y', time());

        try {
            $db->prepare($sql);
            $db->execute($values);
            return $db->fetchAll();
        } catch (Exception $e) {
            return $e;
        }
    }
}
