/**
 * PiratesMap - Analyzer Test Suite
 * Runs the analyzer against sample map pieces and asserts expected results.
 */

const { runAnalysis } = require('../public/analyze.js');
const path = require('path');

const TEST_CASES = [
    {
        filename: 'capture3.png',
        expected: {
            type: 'family',
            description: 'Sister',
            pixels: { x: 2734, y: 729 } // Reference point
        }
    },
    {
        filename: 'capture4.png',
        expected: {
            type: 'family',
            description: 'Sister',
            pixels: { x: 2734, y: 729 }
        }
    },
    {
        filename: 'capture5.png',
        expected: {
            type: 'inca',
            description: 'Inca Treasure',
            pixels: { x: 2383, y: 1240 } // From user logs
        }
    },
    {
        filename: 'MapToSister.png',
        expected: {
            type: 'family',
            description: 'Sister',
            pixels: { x: 2960, y: 920 }
        }
    },
    {
        filename: 'treasure-map.png',
        expected: {
            type: 'treasure',
            description: 'Treasure Map',
            pixels: { x: 2576, y: 603 } // Needs calibration
        }
    }
];

async function runTests() {
    console.log("Starting PiratesMap Analyzer Tests...\n");
    let passed = 0;
    let failed = 0;

    for (const test of TEST_CASES) {
        const filePath = path.join(__dirname, 'fixtures', test.filename);
        console.log(`Testing [${test.filename}]...`);
        
        try {
            const result = await runAnalysis(filePath);
            
            const issues = [];
            if (result.properties.type !== test.expected.type) {
                issues.push(`Type mismatch: expected ${test.expected.type}, got ${result.properties.type}`);
            }
            if (result.properties.description !== test.expected.description) {
                issues.push(`Description mismatch: expected ${test.expected.description}, got ${result.properties.description}`);
            }
            
            // Allow 15px margin of error for manual screenshots
            const dx = Math.abs(result.pixels.x - test.expected.pixels.x);
            const dy = Math.abs(result.pixels.y - test.expected.pixels.y);
            if (dx > 15 || dy > 15) {
                issues.push(`Pixel mismatch: expected ~${test.expected.pixels.x},${test.expected.pixels.y}, got ${result.pixels.x},${result.pixels.y}`);
            }

            if (issues.length === 0) {
                console.log(`  ✅ PASS (Confidence: ${result.confidence.toFixed(1)}%)\n`);
                passed++;
            } else {
                console.log(`  ❌ FAIL:`);
                issues.forEach(msg => console.log(`     - ${msg}`));
                console.log(`     (Confidence: ${result.confidence.toFixed(1)}%)\n`);
                failed++;
            }
        } catch (err) {
            console.log(`  💥 ERROR: ${err.message}\n`);
            failed++;
        }
    }

    console.log(`--- Test Summary ---`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
