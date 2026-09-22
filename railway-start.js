'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const {
  isRailway,
  resolveDatabaseConfig,
  applyDatabaseEnvironment,
  missingRailwayMessage,
  safeDescription
} = require('./CafeKiosk-Backend/config/databaseEnv');

async function start() {
  const config = applyDatabaseEnvironment(resolveDatabaseConfig());

  console.log('');
  console.log('======================================');
  console.log('CafeKiosk Railway startup');
  console.log('======================================');

  if (!config) {
    console.error('⚠️  MySQL configuration was not found.');
    console.error(`   ${missingRailwayMessage()}`);
    console.error('   The web server will still start so Railway does not enter a restart loop,');
    console.error('   but login, signup, orders, and other database features will remain unavailable until MySQL is connected.');
    process.env.CAFEKIOSK_DATABASE_UNAVAILABLE = '1';
  } else {
    console.log(`🟢 Database configuration found: ${safeDescription(config)}`);
    try {
      await require('./railway-init')();
      console.log('🟢 Railway database check completed.');

      try {
        const demoSeed = await require('./CafeKiosk-Backend/seed-demo-cafe')();
        if (demoSeed?.skipped) {
          console.log(`ℹ️  Demo Cafe seed skipped: ${demoSeed.reason || 'disabled'}`);
        } else {
          console.log(
            `🟢 Demo Cafe ready: ${demoSeed?.catalog?.activeProducts || 0} products, ` +
            `${demoSeed?.ingredients || 0} ingredients, ${demoSeed?.recipes || 0} recipes, ` +
            `${demoSeed?.menuConfig?.totalProductConfigs || 0} size/add-on configs.`
          );
        }
      } catch (seedError) {
        console.error(`⚠️  Demo Cafe seed failed: ${seedError.code || 'SEED_ERROR'} - ${seedError.message}`);
        console.error('   CafeKiosk will still start, but cafe-1 demo menu/customizations may be incomplete.');
      }
    } catch (error) {
      console.error(`⚠️  Database initialization/check failed: ${error.code || 'DB_ERROR'} - ${error.message}`);
      console.error('   CafeKiosk will still start. Check the Railway MySQL reference if database pages fail.');
      process.env.CAFEKIOSK_DATABASE_UNAVAILABLE = '1';
    }
  }

  // Railway supplies PORT. Express must bind to all interfaces inside the container.
  process.env.BIND_HOST = '0.0.0.0';
  require('./CafeKiosk-Backend/server');
}

start().catch(error => {
  console.error('❌ Unexpected CafeKiosk startup error:', error);
  // This is a genuine application error, not a missing database reference.
  process.exitCode = 1;
});
