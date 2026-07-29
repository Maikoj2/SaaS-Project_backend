import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAdvancedConfiguration } from './configuration.service';

test('uses safe advanced configuration defaults for legacy create payloads', () => {
    const result = normalizeAdvancedConfiguration({});

    assert.equal(result.distributionStrategy, 'linear');
    assert.deepEqual(result.tablePointsPolicy, {
        winPoints: 2,
        lossPoints: 1,
        walkoverWinPoints: 2,
        walkoverLossPoints: 0
    });
    assert.equal(result.eliminationSettings?.enabled, false);
    assert.equal(result.eliminationSettings?.bracketSize, 4);
});

test('keeps advanced values and forces bestThirdsCount to zero for topPerGroup', () => {
    const result = normalizeAdvancedConfiguration({
        distributionStrategy: 'balanced',
        eliminationSettings: {
            enabled: true,
            qualificationMode: 'topPerGroup',
            topPerGroup: 2,
            bestThirdsCount: 3,
            totalQualifiers: 4,
            normalizeStandingsForUnevenGroups: false,
            bracketSeedingStrategy: 'groupCross',
            bracketSize: 4,
            includeThirdPlaceMatch: true,
            initialMatchNumber: 1,
            autoGenerateAfterGroupStage: false
        }
    });

    assert.equal(result.distributionStrategy, 'balanced');
    assert.equal(result.eliminationSettings?.bestThirdsCount, 0);
    assert.equal(result.eliminationSettings?.bracketSeedingStrategy, 'groupCross');
});
