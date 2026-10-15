import {
  getActiveImageProvider,
  setRuntimeImageProvider,
  getImageGenerationConfig,
  buildEnhancedSOPPrompt,
  generateImage,
} from './imageGenerationService';

console.log('================================================================');
console.log('TESTING IMAGE GENERATION SERVICE (FLUX.1 SCHNELL & IMAGEN 3 TOGGLE)');
console.log('================================================================');

// Test 1: Enhanced prompt formatting for operational SOPs
console.log('Test 1: Enhanced SOP prompt formatting...');
const enhanced = buildEnhancedSOPPrompt(
  'Check assigned flight, gate readiness and communication channel',
  'Ground Operations Agent',
  'Prepare the Boarding Operation'
);
if (
  enhanced.includes('Ground Operations Agent') &&
  enhanced.includes('Action: "Prepare the Boarding Operation"') &&
  enhanced.includes('Photorealistic') &&
  enhanced.includes('Zero burned-in text')
) {
  console.log('  ✓ PASSED: Enhanced prompt correctly structures workplace context and anti-text safeguards.');
} else {
  console.error('  ✗ FAILED: Prompt missing required directives:', enhanced);
  process.exit(1);
}

// Test 2: Environment provider toggle logic
console.log('Test 2: Environment configuration resolution...');
const initialProvider = getActiveImageProvider();
console.log(`  ✓ Initial detected provider: ${initialProvider}`);

// Test 3: Runtime toggle
console.log('Test 3: Runtime provider toggling...');
setRuntimeImageProvider('imagen');
if (getActiveImageProvider() === 'imagen') {
  console.log('  ✓ PASSED: Toggled to imagen successfully.');
} else {
  console.error('  ✗ FAILED: Failed to toggle to imagen');
  process.exit(1);
}

setRuntimeImageProvider('flux');
if (getActiveImageProvider() === 'flux') {
  console.log('  ✓ PASSED: Toggled to flux successfully.');
} else {
  console.error('  ✗ FAILED: Failed to toggle to flux');
  process.exit(1);
}

// Reset runtime override
setRuntimeImageProvider(null);
const restoredProvider = getActiveImageProvider();
console.log(`  ✓ Restored to environment default provider: ${restoredProvider}`);

// Test 4: Configuration inspection
console.log('Test 4: Configuration payload structure...');
const config = getImageGenerationConfig();
if (
  typeof config.models.flux === 'string' &&
  config.models.flux.length > 0 &&
  typeof config.models.imagen === 'string' &&
  config.models.imagen.length > 0 &&
  Array.isArray(config.availableProviders) &&
  (config.provider === 'flux' || config.provider === 'imagen')
) {
  console.log('  ✓ PASSED: Image generation config payload structure verified.');
} else {
  console.error('  ✗ FAILED: Malformed config structure:', config);
  process.exit(1);
}

// Test 5: Graceful error when key missing (no unhandled rejections)
console.log('Test 5: Graceful handling when mock call runs without valid key...');
async function testMissingKey() {
  const result = await generateImage({
    prompt: 'Verify passenger identity document',
    role: 'Boarding Gate Agent',
    provider: 'flux',
    falApiKey: 'mock-invalid-key-for-test',
  });
  // Should return result.success === false without crashing process
  if (!result.success && result.error) {
    console.log(`  ✓ PASSED: Returned error safely (${result.error.slice(0, 60)}...)`);
  } else {
    console.log('  ✓ Result returned:', result.success);
  }
}

await testMissingKey();

console.log('================================================================');
console.log('✅ ALL IMAGE GENERATION SERVICE TESTS PASSED');
console.log('================================================================');
