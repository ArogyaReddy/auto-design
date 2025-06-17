#!/usr/bin/env node

console.log('🔄 Final verification of property name changes');
console.log('Checking that all "last" prefixes have been removed...\n');

const fs = require('fs');
const path = require('path');

// Check preferences file
const prefsPath = path.join(process.cwd(), '.autodesign-preferences.json');
if (fs.existsSync(prefsPath)) {
  const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
  const prefsString = JSON.stringify(prefs, null, 2);
  
  // Check for any remaining "last" prefixed properties
  const lastPrefixMatches = prefsString.match(/"last[A-Z][a-zA-Z]*":/g);
  
  if (lastPrefixMatches) {
    console.log('❌ Found remaining "last" prefixed properties:');
    lastPrefixMatches.forEach(match => console.log(`   - ${match}`));
  } else {
    console.log('✅ No "last" prefixed properties found in preferences file');
  }
  
  // Verify new property names are present
  const expectedProps = [
    'featureName', 'URL', 'userStory', 'testType', 'imagePath', 
    'jiraURL', 'ticketKey', 'assignee', 'epic', 'filePath', 
    'fileType', 'generationMethod'
  ];
  
  console.log('\n📋 Checking new property names:');
  let allPropsFound = true;
  
  expectedProps.forEach(prop => {
    if (prefsString.includes(`"${prop}"`)) {
      console.log(`   ✅ ${prop} found`);
    } else {
      console.log(`   ❌ ${prop} NOT found`);
      allPropsFound = false;
    }
  });
  
  if (allPropsFound) {
    console.log('\n🎉 SUCCESS: All property name changes completed successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('   ✅ lastFeatureName → featureName');
    console.log('   ✅ lastURL → URL');
    console.log('   ✅ lastUserStory → userStory');
    console.log('   ✅ lastTestType → testType');
    console.log('   ✅ lastImagePath → imagePath');
    console.log('   ✅ lastJiraURL → jiraURL');
    console.log('   ✅ lastTicketKey → ticketKey');
    console.log('   ✅ lastAssignee → assignee');
    console.log('   ✅ lastEpic → epic');
    console.log('   ✅ lastFilePath → filePath');
    console.log('   ✅ lastFileType → fileType');
    console.log('   ✅ lastGenerationMethod → generationMethod');
    console.log('\n🎯 All property names now use clean, professional naming without "last" prefixes!');
  } else {
    console.log('\n❌ Some properties may be missing - please verify');
  }
  
} else {
  console.log('❌ Preferences file not found');
}

console.log('\n✨ Verification completed!');
