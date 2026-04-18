/**
 * PiratesMap - Type Matching Test Suite
 * Validates map type and description identification.
 */

const { runAnalysis } = require('../public/analyze.js');
const path = require('path');

const TEST_CASES = [
    { filename: 'capture3.png', expectedType: 'family', expectedDesc: 'Sister' },
    { filename: 'capture4.png', expectedType: 'family', expectedDesc: 'Sister' },
    { filename: 'capture5.png', expectedType: 'inca', expectedDesc: 'Inca Treasure' },
    { filename: 'MapToSister.png', expectedType: 'family', expectedDesc: 'Sister' },
    { filename: 'MapToFather.png', expectedType: 'family', expectedDesc: 'Father' },
    { filename: 'treasure-map.png', expectedType: 'treasure', expectedDesc: 'Treasure Map' }
];

async function runTypeTests() {
    console.log("Starting Type Matching Tests...\n");
    let passed = 0;
    let failed = 0;

    for (const test of TEST_CASES) {
        const filePath = path.join(__dirname, 'fixtures', test.filename);
        process.stdout.write(`Identifying [${test.filename}]... `);
        
        try {
            const result = await runAnalysis(filePath);
            
            const typeMatch = result.properties.type === test.expectedType;
            const descMatch = result.properties.description === test.expectedDesc;

            if (typeMatch && descMatch) {
                console.log(`✅ PASS (${result.properties.description})`);
                passed++;
            } else {
                console.log(`❌ FAIL`);
                if (!typeMatch) console.log(`   - Type: expected ${test.expectedType}, got ${result.properties.type}`);
                if (!descMatch) console.log(`   - Desc: expected ${test.expectedDesc}, got ${result.properties.description}`);
                failed++;
            }
        } catch (err) {
            console.log(`💥 ERROR: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n--- Type Test Summary ---`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

runTypeTests();
