const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pos = fs.readFileSync(path.join(root, 'CafeKiosk-Frontend/Assets/js/pos.js'), 'utf8');
const store = fs.readFileSync(path.join(__dirname, 'services/orderStore.js'), 'utf8');
const controller = fs.readFileSync(path.join(__dirname, 'controllers/orderController.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!/return\s+`POS-\$\{sequence\}`/.test(pos), 'POS still uses collision-prone browser sequence order numbers.');
assert(/POS-\$\{datePart\}-\$\{timePart\}-\$\{randomPart\}/.test(pos), 'POS unique order number format is missing.');
assert(/async function findOrderForCafe\(cafeId,identifier\)/.test(store), 'Tenant-scoped order lookup is missing.');
assert(/findOrderForCafe\(order\.cafeId,order\.orderNumber\)/.test(store), 'createOrder duplicate detection is not tenant-scoped.');
assert(/\.findOrderForCafe\(\s*order\.cafeId,\s*order\.orderNumber\s*\)/s.test(controller), 'Controller inventory duplicate check is not tenant-scoped.');
assert(/forwarding\.queueVerified/.test(controller), 'Backend queue persistence verification is missing.');
assert(/forwarding\.queueVerified\s*!==\s*true/.test(pos), 'POS does not require backend queue verification before success.');

console.log('✅ POS -> Order Queue forwarding regression checks passed.');
