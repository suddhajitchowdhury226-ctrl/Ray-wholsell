/**
 * Setup Manufacturers Script
 * Initialize RHL1, RHL2, RHL3 manufacturers in database
 * Run: node setup-manufacturers.js
 */

const mongoose = require('mongoose');
const Manufacturer = require('./Models/manufacturerModel');
require('dotenv').config();

async function setupManufacturers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const defaultManufacturers = [
      {
        manufacturerId: 'RHL1',
        companyName: 'Vitality Works (RHL1)',
        contactPerson: {
          name: 'Vitality Works Contact',
          email: 'contact@vitalityworks.com'
        },
        technicalContact: {
          name: 'Technical Support',
          email: 'technical@vitalityworks.com',
          title: 'Integration Manager'
        },
        orderingMethod: 'orderdog',
        status: 'active',
        productIdField: 'manufacturerItemNumber',
        integrationDetails: {
          type: 'orderdog',
          status: 'not_configured',
          technicalNotes: 'OrderDog integration - awaiting technical specification from Vitality Works'
        },
        productCategories: [
          'Single Herbal Liquid Extracts',
          'Herbal Formula Liquid Extracts',
          'CBD',
          'Vitamins & Minerals',
          'Kids Formulas',
          'Stevia',
          'Carrier Oils',
          'Essential Oils',
          'Herbal Oils',
          'Herbal Powders'
        ],
        internalNotes: 'Primary supplier for herbal extracts and supplements',
        setupNotes: 'Configured as primary RHL1 manufacturer'
      },
      {
        manufacturerId: 'RHL2',
        companyName: 'RHL2 Manufacturer',
        contactPerson: {
          name: 'RHL2 Contact',
          email: 'contact@rhl2.com'
        },
        orderingMethod: 'email',
        status: 'active',
        productIdField: 'manufacturerItemNumber',
        integrationDetails: {
          type: 'none',
          status: 'not_configured'
        },
        productCategories: [],
        internalNotes: 'Secondary supplier - configuration pending',
        setupNotes: 'Setup for future manufacturer integration'
      },
      {
        manufacturerId: 'RHL3',
        companyName: 'RHL3 Manufacturer',
        contactPerson: {
          name: 'RHL3 Contact',
          email: 'contact@rhl3.com'
        },
        orderingMethod: 'email',
        status: 'active',
        productIdField: 'manufacturerItemNumber',
        integrationDetails: {
          type: 'none',
          status: 'not_configured'
        },
        productCategories: [],
        internalNotes: 'Tertiary supplier - configuration pending',
        setupNotes: 'Setup for future manufacturer integration'
      }
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const mfgData of defaultManufacturers) {
      const existing = await Manufacturer.findOne({ manufacturerId: mfgData.manufacturerId });
      
      if (existing) {
        // Update existing
        await Manufacturer.findOneAndUpdate(
          { manufacturerId: mfgData.manufacturerId },
          mfgData,
          { new: true }
        );
        updatedCount++;
        console.log(`📝 Updated manufacturer: ${mfgData.manufacturerId}`);
      } else {
        // Create new
        await Manufacturer.create(mfgData);
        createdCount++;
        console.log(`✅ Created manufacturer: ${mfgData.manufacturerId}`);
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('🎉 MANUFACTURERS SETUP COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Created: ${createdCount}`);
    console.log(`📝 Updated: ${updatedCount}`);
    console.log('═══════════════════════════════════════\n');

    // Display summary
    const allManufacturers = await Manufacturer.find().select('manufacturerId companyName status');
    console.log('Active Manufacturers:');
    allManufacturers.forEach(m => {
      console.log(`  • ${m.manufacturerId}: ${m.companyName} [${m.status}]`);
    });

    console.log('\n✨ Setup complete! Manufacturers ready for product assignment.\n');

  } catch (error) {
    console.error('❌ Error setting up manufacturers:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

setupManufacturers();
